/**
 * Billing failure after successful clean export (batch).
 * Run: node --env-file=.env.local scripts/qa-billing-failure-batch.cjs
 */
const { chromium, devices } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("node:path");

const BASE = "http://localhost:3000";
const QA_EMAIL = "qa-automation@putwatermark.test";
const QA_PASSWORD = "QaAutomationPass123!";

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url, anonKey);
  const { data: signIn } = await anon.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  const userId = signIn.user.id;

  await admin.from("credit_balances").upsert(
    { user_id: userId, balance: 100 },
    { onConflict: "user_id" },
  );

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
      value: encodeURIComponent(JSON.stringify(signIn.session)),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  let downloaded = false;
  page.on("download", () => {
    downloaded = true;
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

  await page.getByRole("button", { name: /^Export all$/i }).click();
  await page.waitForTimeout(15000);

  const bodyText = await page.locator("body").innerText();
  const noticeText = await page
    .locator("text=/Export completed, but credits/i")
    .first()
    .textContent()
    .catch(() => null);
  const output = {
    billingCalled,
    downloaded,
    noticeText,
    billingNoticeInBody: /Export completed, but credits couldn'?t be deducted/i.test(
      bodyText,
    ),
    exportFailed: /could not export/i.test(bodyText),
    uploadError: /could not export those images/i.test(bodyText),
  };
  console.log(JSON.stringify(output, null, 2));

  await admin.from("credit_balances").upsert(
    { user_id: userId, balance: 0 },
    { onConflict: "user_id" },
  );

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
