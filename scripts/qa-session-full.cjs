/**
 * QA pass for mobile editor + checkout + export session (commit 0b8cdb0+).
 * Run: node scripts/qa-session-full.cjs
 * Requires: dev server at localhost:3000, playwright, jszip
 */
const { chromium, devices } = require("playwright");
const path = require("node:path");
const JSZip = require("jszip");

const iPhone = devices["iPhone 13"];
const widths = [375, 390, 414];
const BASE = "http://localhost:3000";

function fakeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-signature`;
}

async function fetchProdDeployInfo() {
  const info = {
    reachable: false,
    status: null,
    vercelId: null,
    scriptCount: 0,
    markers: {},
    commitHint: null,
  };

  try {
    const res = await fetch("https://www.putwatermark.com/watermark");
    info.reachable = true;
    info.status = res.status;
    info.vercelId = res.headers.get("x-vercel-id");
    const html = await res.text();
    const scriptUrls = [
      ...new Set(
        [...html.matchAll(/\/_next\/static\/[^"' ]+\.js/g)].map(
          (m) => `https://www.putwatermark.com${m[0]}`,
        ),
      ),
    ];
    info.scriptCount = scriptUrls.length;

    const markerKeys = [
      "Custom plan",
      "scrollInputIntoViewOnMobile",
      "Export completed, but credits could not be deducted",
      "editor-mobile-footer",
      "Export all",
      "Custom credit pack amount",
    ];
    for (const key of markerKeys) info.markers[key] = false;

    for (const url of scriptUrls.slice(0, 80)) {
      try {
        const js = await (await fetch(url)).text();
        for (const key of markerKeys) {
          if (js.includes(key)) info.markers[key] = true;
        }
        const commitMatch = js.match(/0b8cdb0|5679183|f46b31a/);
        if (commitMatch) info.commitHint = commitMatch[0];
      } catch {
        // ignore chunk fetch errors
      }
    }

    const cssRes = await fetch("https://www.putwatermark.com/watermark");
    info.hasEditorMobileFooterClass = html.includes("editor-mobile-footer");
  } catch (error) {
    info.error = String(error);
  }

  return info;
}

async function setupAuthenticatedContext(context) {
  const now = Math.floor(Date.now() / 1000);
  const userId = "qa-test-user-00000000-0000-0000-0000-000000000001";
  const session = {
    access_token: fakeJwt({
      sub: userId,
      email: "qa@test.putwatermark.local",
      role: "authenticated",
      exp: now + 3600,
    }),
    refresh_token: "qa-refresh-token",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: {
      id: userId,
      email: "qa@test.putwatermark.local",
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: "email" },
      user_metadata: {},
      aud: "authenticated",
      role: "authenticated",
    },
  };

  await context.route("**/auth/v1/user**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session.user),
    }),
  );

  await context.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    }),
  );

  await context.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ display_name: "QA Tester" }]),
    }),
  );

  await context.route("**/rest/v1/user_credits**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ balance: 0 }]),
    }),
  );

  await context.addInitScript((sess) => {
    const key = Object.keys(localStorage).find((k) => k.includes("-auth-token"));
    const storageKey =
      key ?? `sb-${location.hostname.replace(/\./g, "-")}-auth-token`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentSession: sess,
        expiresAt: sess.expires_at * 1000,
      }),
    );
  }, session);
}

async function loadEditorWithBatch(page) {
  const heroPortrait = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
  const kim = path.join(process.cwd(), "public/Kim.png");
  await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles([heroPortrait, kim]);
  await page.waitForTimeout(4000);
}

async function sampleImageStats(page, bytes) {
  return page.evaluate(async (byteArray) => {
    const blob = new Blob([new Uint8Array(byteArray)], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const w = canvas.width;
    const h = canvas.height;

    function regionAvg(x, y, rw, rh) {
      const data = ctx.getImageData(x, y, rw, rh).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      return sum / (data.length / 4);
    }

    return {
      width: w,
      height: h,
      corner: regionAvg(0, 0, Math.floor(w * 0.15), Math.floor(h * 0.15)),
      center: regionAvg(
        Math.floor(w * 0.35),
        Math.floor(h * 0.35),
        Math.floor(w * 0.3),
        Math.floor(h * 0.3),
      ),
      edge: regionAvg(Math.floor(w * 0.05), Math.floor(h * 0.75), Math.floor(w * 0.2), Math.floor(h * 0.15)),
    };
  }, [...bytes]);
}

function hasForcedStampSignal(stats) {
  // Center stamp + tile pattern should lift center and/or corners vs pure photo baseline
  return stats.center > stats.corner + 2 || stats.center > 90;
}

(async () => {
  const results = { tests: {}, production: await fetchProdDeployInfo() };
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];

  // --- 3 Mobile load ---
  {
    const ctx = await browser.newContext({ ...iPhone });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => pageErrors.push(String(e)));

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    results.tests.mobileLoadLanding = await page.evaluate(() => ({
      scrollY: window.scrollY,
      docEl: document.documentElement.scrollTop,
    }));
    await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
    results.tests.mobileLoadEditor = await page.evaluate(() => ({
      scrollY: window.scrollY,
      docEl: document.documentElement.scrollTop,
    }));
    await ctx.close();
  }

  // --- 5 Footer overlap + 6 Captions (local dev) ---
  {
    const ctx = await browser.newContext({ ...iPhone });
    const page = await ctx.newPage();
    await loadEditorWithBatch(page);

    results.tests.footerOverlap = {};
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(250);
      results.tests.footerOverlap[width] = await page.evaluate(() => {
        const footer = document.querySelector("footer");
        if (!footer) return { footerFound: false };
        const buttons = [...footer.querySelectorAll("button")].map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.getAttribute("aria-label") || button.textContent?.trim() || "",
            rect,
          };
        });
        const overlaps = (a, b) =>
          !(
            a.rect.right <= b.rect.left ||
            b.rect.right <= a.rect.left ||
            a.rect.bottom <= b.rect.top ||
            b.rect.bottom <= a.rect.top
          );
        const buy = buttons.find((b) => /buy/i.test(b.label));
        const swap = buttons.find((b) => /replace|swap/i.test(b.label));
        const add = buttons.find((b) => /add/i.test(b.label));
        const del = buttons.find((b) => /delete|remove/i.test(b.label));
        return {
          footerFound: true,
          buySwapOverlap: buy && swap ? overlaps(buy, swap) : null,
          buyAddOverlap: buy && add ? overlaps(buy, add) : null,
          buyDeleteOverlap: buy && del ? overlaps(buy, del) : null,
          buttons: buttons.map((b) => ({
            label: b.label,
            left: Math.round(b.rect.left),
            right: Math.round(b.rect.right),
          })),
        };
      });
    }

    results.tests.captions = await page.evaluate(() => {
      const zoomToolbar = document.querySelector('[aria-label="Canvas zoom controls"]');
      const zoomCaptions = zoomToolbar
        ? [...zoomToolbar.querySelectorAll("span")].map((s) => {
            const styles = getComputedStyle(s);
            return {
              text: s.textContent?.trim(),
              color: styles.color,
              fontSize: styles.fontSize,
              opacity: styles.opacity,
            };
          })
        : [];

      const checkerboard = document.querySelector(".preview-checkerboard");
      let checkerboardBehindControls = false;
      if (checkerboard && zoomToolbar) {
        const cbRect = checkerboard.getBoundingClientRect();
        const zRect = zoomToolbar.getBoundingClientRect();
        checkerboardBehindControls =
          cbRect.top < zRect.bottom && cbRect.bottom > zRect.top;
      }

      const mediaFooter = document.querySelector("footer .pointer-events-auto");
      const mediaCaptions = mediaFooter
        ? [...mediaFooter.querySelectorAll("span")].map((s) => s.textContent?.trim())
        : [];

      return {
        zoomToolbarFound: Boolean(zoomToolbar),
        zoomCaptions,
        checkerboardBehindControls,
        mediaCaptions,
      };
    });

    await ctx.close();
  }

  // --- 2 Export login gate / OTP scroll ---
  {
    const ctx = await browser.newContext({ ...iPhone });
    const page = await ctx.newPage();
    const gateErrors = [];
    page.on("pageerror", (e) => gateErrors.push(String(e)));

    await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
    const heroPortrait = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
    await page.locator('input[type="file"]').first().setInputFiles(heroPortrait);
    await page.waitForTimeout(3000);

    await page.getByRole("button", { name: /^Export/i }).click();
    await page.waitForTimeout(2500);

    results.tests.exportLoginGate = {
      dialogOpen: (await page.getByRole("dialog").count()) > 0,
      gateErrors,
    };

    const email = page.locator('input[type="email"]').first();
    if (await email.count()) {
      await email.focus();
      await page.waitForTimeout(200);
    }

    const password = page.locator('input[type="password"]').first();
    if (await password.count()) {
      await password.focus();
      await page.waitForTimeout(300);
      const dialogBox = await page.getByRole("dialog").first().boundingBox();
      results.tests.exportLoginGate.keyboardFocus = {
        dialogY: dialogBox?.y,
        dialogHeight: dialogBox?.height,
        dialogInViewport:
          dialogBox && dialogBox.y >= -20 && dialogBox.y + dialogBox.height <= 864,
      };
    }

    // Simulate OTP transition: focus email (schedules rAF scroll), then remove node
    results.tests.exportLoginGate.scrollGuard = await page.evaluate(async () => {
      const { scrollInputIntoViewOnMobile } = await import("/_next/static/chunks/app/watermark/page.js").catch(
        () => ({ scrollInputIntoViewOnMobile: null }),
      );

      // Inline replica of production helper
      function scrollInputIntoViewOnMobileTest(element) {
        if (!element || window.innerWidth >= 768) return;
        window.requestAnimationFrame(() => {
          if (!element.isConnected) return;
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }

      let crashed = false;
      const el = document.createElement("input");
      document.body.appendChild(el);
      scrollInputIntoViewOnMobileTest(el);
      el.remove();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        el.scrollIntoView();
      } catch {
        crashed = true;
      }
      return { helperImportFound: Boolean(scrollInputIntoViewOnMobile), postRemoveCrash: crashed };
    });

    // Signup mode to expose OTP path UI (without completing verify)
    const signupTab = page.getByRole("button", { name: /^Sign up$/i });
    if (await signupTab.count()) {
      await signupTab.click();
      await page.waitForTimeout(300);
      results.tests.exportLoginGate.signupModeVisible = true;
    }

    await ctx.close();
  }

  // --- 4 Checkout (authenticated) ---
  {
    const ctx = await browser.newContext({ ...iPhone });
    await setupAuthenticatedContext(ctx);
    const page = await ctx.newPage();
    await loadEditorWithBatch(page);
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Buy credits" }).click({ force: true });
    await page.waitForTimeout(1500);

    const tierSelect = page.locator('select[id$="-tier"]');
    const checkoutDialog = page.getByRole("dialog").filter({ hasText: /Grow|Premium|checkout/i });
    results.tests.checkout = {
      dialogCount: await page.getByRole("dialog").count(),
      tierSelectVisible: (await tierSelect.count()) > 0,
      bodySnippet: (await page.locator("body").innerText()).slice(0, 400),
    };

    if (await tierSelect.count()) {
      results.tests.checkout.defaultTier = await tierSelect.inputValue();
      results.tests.checkout.options = await tierSelect.locator("option").allTextContents();
    }

    const customPlan = page.getByText("Custom plan", { exact: true });
    if (await customPlan.count()) {
      await customPlan.click();
      await page.waitForTimeout(400);
      const slider = page.locator('input[type="range"][aria-label="Custom credit pack amount"]');
      results.tests.checkout.sliderVisible = (await slider.count()) > 0;
      if (await slider.count()) {
        await slider.fill("20000");
        await page.waitForTimeout(200);
        const bodyText = await page.locator("body").innerText();
        results.tests.checkout.sliderValue = await slider.inputValue();
        results.tests.checkout.has3200Price = /\$32\.00|32\.00/.test(bodyText);
        results.tests.checkout.has20000Credits = /20[,.]?000/.test(bodyText);
      }
    }

    // Desktop entry via ToolIconRail not visible on mobile; note limitation
    results.tests.checkout.desktopEntryTested = false;
    await ctx.close();
  }

  // --- 1 Batch forced watermark + billing failure ---
  {
    const ctx = await browser.newContext({ ...iPhone, acceptDownloads: true });
    await setupAuthenticatedContext(ctx);
    const page = await ctx.newPage();
    let downloadedZip = null;
    page.on("download", async (download) => {
      try {
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        downloadedZip = Buffer.concat(chunks);
      } catch (error) {
        downloadedZip = { error: String(error) };
      }
    });

    let authorizeCalls = 0;
    await page.route("**/api/export/authorize**", async (route) => {
      authorizeCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tier: "clean",
          balance: 0,
          cost: 2,
          exportId: "qa-batch",
        }),
      });
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

    await loadEditorWithBatch(page);
    await page.waitForTimeout(1500);

    const exportAllBtn = page.getByRole("button", { name: /^Export all$/i });
    results.tests.batchForcedWatermark = {
      exportAllFound: (await exportAllBtn.count()) > 0,
      authorizeCallsBefore: authorizeCalls,
    };

    if (await exportAllBtn.count()) {
      await exportAllBtn.click();
      await page.waitForTimeout(1500);

      // Watermarked upsell modal for 0-balance user
      const continueBtn = page.getByRole("button", {
        name: /Continue with watermark|watermarked export/i,
      });
      if (await continueBtn.count()) {
        await continueBtn.click();
        await page.waitForTimeout(10000);
      } else {
        await page.waitForTimeout(8000);
      }

      const bodyText = await page.locator("body").innerText();
      results.tests.batchForcedWatermark.authorizeCalls = authorizeCalls;
      results.tests.batchForcedWatermark.billingCalled = billingCalled;
      results.tests.batchForcedWatermark.exportFailedMessage = /could not export/i.test(bodyText);
      results.tests.batchForcedWatermark.billingNotice = bodyText.includes(
        "Export completed, but credits could not be deducted",
      );
      results.tests.batchForcedWatermark.isExporting = await page
        .getByRole("button", { name: /Processing/i })
        .count();

      if (downloadedZip && Buffer.isBuffer(downloadedZip)) {
        const zip = await JSZip.loadAsync(downloadedZip);
        const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
        results.tests.batchForcedWatermark.zipFileCount = names.length;
        results.tests.batchForcedWatermark.zipFiles = names;

        const perFile = {};
        for (const name of names) {
          const buf = await zip.file(name).async("nodebuffer");
          const stats = await sampleImageStats(page, buf);
          perFile[name] = { ...stats, hasStamp: hasForcedStampSignal(stats) };
        }
        results.tests.batchForcedWatermark.perFile = perFile;
        results.tests.batchForcedWatermark.allFilesStamped = Object.values(perFile).every(
          (f) => f.hasStamp,
        );
      } else {
        results.tests.batchForcedWatermark.download = downloadedZip ? "failed" : null;
      }
    }

    await ctx.close();
  }

  // --- Run forced tile unit test ---
  {
    const { execSync } = require("node:child_process");
    try {
      execSync("node scripts/test-forced-tile-export.mjs", {
        cwd: process.cwd(),
        stdio: "pipe",
      });
      results.tests.forcedTileUnitTest = "PASS";
    } catch (error) {
      results.tests.forcedTileUnitTest = `FAIL: ${error.stderr?.toString() || error.message}`;
    }
  }

  results.pageErrors = pageErrors;
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
