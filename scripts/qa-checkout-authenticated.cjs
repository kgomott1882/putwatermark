/**
 * Authenticated checkout UI QA.
 * Run: node --env-file=.env.local scripts/qa-checkout-authenticated.cjs
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

  let user = (
    await admin.auth.admin.listUsers({ perPage: 200 })
  ).data.users.find((u) => u.email === QA_EMAIL);

  if (!user) {
    user = (
      await admin.auth.admin.createUser({
        email: QA_EMAIL,
        password: QA_PASSWORD,
        email_confirm: true,
      })
    ).data.user;
  }

  const anon = createClient(url, anonKey);
  const { data: signIn } = await anon.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const profile of ["mobile", "desktop"]) {
    const context = await browser.newContext({
      ...(profile === "mobile" ? devices["iPhone 13"] : { viewport: { width: 1280, height: 800 } }),
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
    await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
    const img = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
    await page.locator('input[type="file"]').first().setInputFiles(img);
    await page.waitForTimeout(3500);

    if (profile === "desktop") {
      const buyDesktop = page.getByRole("button", { name: /Buy credits/i }).first();
      await buyDesktop.click({ force: true });
    } else {
      await page.getByRole("button", { name: "Buy credits" }).click({ force: true });
    }

    await page.waitForTimeout(1500);

    const tierSelect = page.locator('select[id$="-tier"]');
    results[profile] = {
      tierSelectVisible: (await tierSelect.count()) > 0,
      loginGateVisible: (await page.getByText("Sign in to export").count()) > 0,
    };

    if (await tierSelect.count()) {
      results[profile].defaultTier = await tierSelect.inputValue();
      results[profile].options = await tierSelect.locator("option").allTextContents();
    }

    const customPlan = page.getByText("Custom plan", { exact: true });
    if (await customPlan.count()) {
      await customPlan.click();
      await page.waitForTimeout(400);
      const slider = page.locator('input[type="range"][aria-label="Custom credit pack amount"]');
      results[profile].sliderVisible = (await slider.count()) > 0;
      if (await slider.count()) {
        await slider.fill("20000");
        await page.waitForTimeout(300);
        const body = await page.locator("body").innerText();
        results[profile].sliderValue = await slider.inputValue();
        results[profile].has3200Price = /\$32\.00/.test(body);
      }
    }

    await context.close();
  }

  results.paypalPurchaseTested = false;
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
