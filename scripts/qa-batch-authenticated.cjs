/**
 * Authenticated batch export QA using Supabase service role.
 * Run: node --env-file=.env.local scripts/qa-batch-authenticated.cjs
 */
const { chromium, devices } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("node:path");
const JSZip = require("jszip");

const BASE = "http://localhost:3000";
const QA_EMAIL = "qa-automation@putwatermark.test";
const QA_PASSWORD = "QaAutomationPass123!";

async function ensureQaUser(admin) {
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.data.users.find((u) => u.email === QA_EMAIL);

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: QA_EMAIL,
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (created.error) {
      throw new Error(`createUser failed: ${created.error.message}`);
    }
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: QA_PASSWORD,
      email_confirm: true,
    });
  }

  if (!user) throw new Error("Could not create QA user");

  const { error: balanceError } = await admin.from("credit_balances").upsert(
    { user_id: user.id, balance: 0 },
    { onConflict: "user_id" },
  );
  if (balanceError) {
    throw new Error(`credit_balances upsert failed: ${balanceError.message}`);
  }

  return user;
}

async function sampleStats(page, bytes) {
  return page.evaluate(async (arr) => {
    const blob = new Blob([new Uint8Array(arr)], { type: "image/jpeg" });
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const avg = (x, y, w, h) => {
      const d = ctx.getImageData(x, y, w, h).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
      return s / (d.length / 4);
    };
    const W = c.width;
    const H = c.height;
    return {
      corner: avg(0, 0, Math.floor(W * 0.12), Math.floor(H * 0.12)),
      center: avg(Math.floor(W * 0.35), Math.floor(H * 0.35), Math.floor(W * 0.3), Math.floor(H * 0.3)),
    };
  }, [...bytes]);
}

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let signIn = await anon.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });

  if (signIn.error) {
    const user = await ensureQaUser(admin);
    signIn = await anon.auth.signInWithPassword({
      email: QA_EMAIL,
      password: QA_PASSWORD,
    });
    if (signIn.error) {
      throw new Error(`signIn failed after create: ${signIn.error.message}`);
    }
    await admin.from("credit_balances").upsert(
      { user_id: user.id, balance: 0 },
      { onConflict: "user_id" },
    );
  } else {
    const user = signIn.data.user;
    if (user) {
      await admin.from("credit_balances").upsert(
        { user_id: user.id, balance: 0 },
        { onConflict: "user_id" },
      );
    }
  }

  const session = signIn.data.session;
  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    acceptDownloads: true,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: encodeURIComponent(JSON.stringify(session)),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  let zipBuf = null;
  page.on("download", async (dl) => {
    const stream = await dl.createReadStream();
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    zipBuf = Buffer.concat(chunks);
  });

  let billingCalled = false;
  await page.route("**/api/export/consume**", async (route) => {
    billingCalled = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "billing fail" }),
    });
  });

  const imgA = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
  const imgB = path.join(process.cwd(), "public/Kim.png");

  await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles([imgA, imgB]);
  await page.waitForTimeout(5000);

  const exportAll = page.getByRole("button", { name: /^Export all$/i });
  if (!(await exportAll.count())) {
    console.log(JSON.stringify({ error: "Export all button not found" }));
    await browser.close();
    process.exit(1);
  }

  await exportAll.click();
  await page.waitForTimeout(2000);

  const upsell = page.getByRole("button", { name: /Continue Free With Watermark/i });
  if (await upsell.count()) {
    await upsell.click({ force: true });
    await page.waitForTimeout(15000);
  } else {
    await page.waitForTimeout(12000);
  }

  const bodyText = await page.locator("body").innerText();
  const result = {
    billingCalled,
    billingNotice: bodyText.includes(
      "Export completed, but credits could not be deducted",
    ),
    exportFailed: /could not export/i.test(bodyText),
    zipDownloaded: Boolean(zipBuf && zipBuf.length > 0),
    zipSize: zipBuf?.length ?? 0,
  };

  if (zipBuf && zipBuf.length > 0) {
    const zip = await JSZip.loadAsync(zipBuf);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    result.zipFileCount = names.length;
    result.perFile = {};
    for (const name of names) {
      const buf = await zip.file(name).async("nodebuffer");
      const stats = await sampleStats(page, buf);
      result.perFile[name] = {
        ...stats,
        hasForcedStamp: stats.center > stats.corner + 2 || stats.center > 85,
      };
    }
    result.allFilesStamped = Object.values(result.perFile).every((f) => f.hasForcedStamp);
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
