/**
 * Export login gate keyboard + scroll guard QA.
 */
const { chromium, devices } = require("playwright");
const path = require("node:path");

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(process.cwd(), "public/Pics/hero-portrait.jpg"));
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /^Export/i }).click();
  await page.waitForTimeout(3000);

  // Wait for auth phase (not saving)
  await page.waitForFunction(
    () => document.body.innerText.includes("Continue to export") || document.body.innerText.includes("Log in"),
    { timeout: 15000 },
  );

  const email = page.locator('input[type="email"]').first();
  await email.focus();
  await page.waitForTimeout(200);

  const password = page.locator('input[type="password"]').first();
  await password.focus();
  await page.waitForTimeout(300);

  const dialogBox = await page.getByRole("dialog").first().boundingBox();

  // scrollInputIntoView guard: detached element should not throw in rAF
  const scrollGuard = await page.evaluate(async () => {
    function scrollInputIntoViewOnMobile(element) {
      if (!element || window.innerWidth >= 768) return;
      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          let threw = false;
          try {
            if (!element.isConnected) {
              resolve({ skipped: true, threw: false });
              return;
            }
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {
            threw = true;
          }
          resolve({ skipped: false, threw });
        });
      });
    }

    const el = document.createElement("input");
    document.body.appendChild(el);
    el.focus();
    scrollInputIntoViewOnMobile(el);
    el.remove();
    const result = await scrollInputIntoViewOnMobile(el);
    return result;
  });

  // Switch to signup to check layout with extra fields
  const signup = page.getByRole("button", { name: /^Sign up$/i });
  if (await signup.count()) {
    await signup.click();
    await page.waitForTimeout(300);
  }

  const nameField = page.locator('input[autocomplete="given-name"]');
  if (await nameField.count()) {
    await nameField.focus();
    await page.waitForTimeout(200);
  }

  console.log(
    JSON.stringify(
      {
        pageErrors: errors,
        dialogVisible: Boolean(dialogBox),
        dialogInViewport:
          dialogBox &&
          dialogBox.y >= -40 &&
          dialogBox.y + dialogBox.height <= 900,
        scrollGuard,
        signupFieldsVisible: (await nameField.count()) > 0,
      },
      null,
      2,
    ),
  );

  await browser.close();
})();
