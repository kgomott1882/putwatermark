/**
 * Focused batch export + checkout QA with Supabase route mocking.
 */
const { chromium, devices } = require("playwright");
const path = require("node:path");
const JSZip = require("jszip");

const BASE = "http://localhost:3000";
const userId = "qa-user-00000000-0000-0000-0000-000000000001";

function fakeUser() {
  return {
    id: userId,
    email: "qa@test.local",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: { display_name: "QA" },
    aud: "authenticated",
    role: "authenticated",
  };
}

async function mockSupabase(context) {
  await context.route("**/*supabase.co/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeUser()),
      });
    }
    if (url.includes("/auth/v1/token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "qa-access-token",
          refresh_token: "qa-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: fakeUser(),
        }),
      });
    }
    if (url.includes("credit_balances")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance: 0 }),
      });
    }
    if (url.includes("profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ display_name: "QA Tester" }),
      });
    }
    return route.continue();
  });
}

async function loadBatch(page) {
  const a = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
  const b = path.join(process.cwd(), "public/Kim.png");
  await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles([a, b]);
  await page.waitForTimeout(4500);
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
      corner: avg(0, 0, W * 0.15, H * 0.15),
      center: avg(W * 0.35, H * 0.35, W * 0.3, H * 0.3),
    };
  }, [...bytes]);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    acceptDownloads: true,
  });
  await mockSupabase(context);

  const page = await context.newPage();
  let zipBuf = null;
  page.on("download", async (dl) => {
    const stream = await dl.createReadStream();
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    zipBuf = Buffer.concat(chunks);
  });

  let authorizeCalls = 0;
  await page.route("**/api/export/authorize**", async (route) => {
    authorizeCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tier: "clean", balance: 0, cost: 2 }),
    });
  });

  let billingCalled = false;
  await page.route("**/api/export/consume**", async (route) => {
    billingCalled = true;
    await route.fulfill({ status: 500, body: JSON.stringify({ error: "fail" }) });
  });

  await loadBatch(page);

  // Inject session cookie pattern used by @supabase/ssr
  await page.evaluate((uid) => {
    document.cookie = `sb-localhost-auth-token=${encodeURIComponent(
      JSON.stringify({
        access_token: "qa-token",
        refresh_token: "qa-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: uid,
          email: "qa@test.local",
          email_confirmed_at: new Date().toISOString(),
        },
      }),
    )}; path=/`;
  }, userId);

  await page.reload({ waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles([
    path.join(process.cwd(), "public/Pics/hero-portrait.jpg"),
    path.join(process.cwd(), "public/Kim.png"),
  ]);
  await page.waitForTimeout(4500);

  const bodyBefore = await page.locator("body").innerText();
  const exportAll = page.getByRole("button", { name: /^Export all$/i });
  console.log("exportAll count", await exportAll.count());
  console.log("body has Sign in", bodyBefore.includes("Sign in"));

  await exportAll.click();
  await page.waitForTimeout(2000);

  const afterClickBody = await page.locator("body").innerText();
  console.log("after click dialogs:", await page.getByRole("dialog").count());
  console.log("after click snippet:", afterClickBody.slice(0, 300));

  const continueBtn = page.getByRole("button", {
    name: /Continue with watermark|Export with watermark|watermark/i,
  });
  if (await continueBtn.count()) {
    console.log("clicking upsell continue");
    await continueBtn.first().click();
    await page.waitForTimeout(12000);
  }

  console.log(
    JSON.stringify(
      {
        authorizeCalls,
        billingCalled,
        billingNotice: afterClickBody.includes(
          "Export completed, but credits could not be deducted",
        ),
        exportFailed: /could not export/i.test(await page.locator("body").innerText()),
        zipSize: zipBuf?.length ?? 0,
      },
      null,
      2,
    ),
  );

  if (zipBuf) {
    const zip = await JSZip.loadAsync(zipBuf);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    const stats = {};
    for (const n of names) {
      const buf = await zip.file(n).async("nodebuffer");
      const s = await sampleStats(page, buf);
      stats[n] = { ...s, stamped: s.center > s.corner + 2 || s.center > 90 };
    }
    console.log("zip files", names);
    console.log("stats", JSON.stringify(stats, null, 2));
  }

  await browser.close();
})();
