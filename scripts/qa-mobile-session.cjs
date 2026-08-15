const { chromium, devices } = require("playwright");
const path = require("node:path");
const JSZip = require("jszip");

const iPhone = devices["iPhone 13"];
const widths = [375, 390, 414];

async function fetchProdMarkers() {
  const res = await fetch("https://www.putwatermark.com/watermark");
  const html = await res.text();
  const scriptUrls = [
    ...new Set(
      [...html.matchAll(/\/_next\/static\/[^"' ]+\.js/g)].map(
        (match) => `https://www.putwatermark.com${match[0]}`,
      ),
    ),
  ];

  const scriptHits = {
    customPlan: false,
    scrollHelper: false,
    growDefault: false,
    editorFooterMobile: false,
    captionProp: false,
  };

  for (const url of scriptUrls) {
    try {
      const js = await (await fetch(url)).text();
      if (js.includes("Custom plan")) scriptHits.customPlan = true;
      if (js.includes("scrollInputIntoViewOnMobile")) scriptHits.scrollHelper = true;
      if (js.includes('useState("grow")')) scriptHits.growDefault = true;
      if (js.includes("EditorFooterMobileAction")) scriptHits.editorFooterMobile = true;
      if (js.includes('caption:"In"') || js.includes("caption: \"In\"")) {
        scriptHits.captionProp = true;
      }
    } catch {
      // ignore
    }
  }

  return { scriptCount: scriptUrls.length, scriptHits };
}

async function loadEditorWithBatch(page) {
  const heroPortrait = path.join(process.cwd(), "public/Pics/hero-portrait.jpg");
  const kim = path.join(process.cwd(), "public/Kim.png");
  await page.goto("http://localhost:3000/watermark", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles([heroPortrait, kim]);
  await page.waitForTimeout(3500);
}

(async () => {
  const results = { tests: {} };
  results.production = await fetchProdMarkers();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  // 3 Mobile load
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  results.tests.mobileLoadLanding = await page.evaluate(() => ({
    scrollY: window.scrollY,
    docEl: document.documentElement.scrollTop,
  }));
  await page.goto("http://localhost:3000/watermark", { waitUntil: "networkidle" });
  results.tests.mobileLoadEditor = await page.evaluate(() => ({
    scrollY: window.scrollY,
    docEl: document.documentElement.scrollTop,
  }));

  // 4 Checkout UI first (before export gate)
  await loadEditorWithBatch(page);
  const buyBtn = page.getByRole("button", { name: "Buy credits" });
  results.tests.checkout = {};
  if (await buyBtn.count()) {
    await buyBtn.click({ force: true });
    await page.waitForTimeout(1200);
    const tierSelect = page.locator('select[id$="-tier"]');
    results.tests.checkout.tierSelectVisible = (await tierSelect.count()) > 0;
    if (results.tests.checkout.tierSelectVisible) {
      results.tests.checkout.defaultTier = await tierSelect.inputValue();
      results.tests.checkout.options = await tierSelect.locator("option").allTextContents();
    }
    const customPlan = page.getByText("Custom plan", { exact: true });
    results.tests.checkout.customPlanVisible = (await customPlan.count()) > 0;
    if (results.tests.checkout.customPlanVisible) {
      await customPlan.click();
      await page.waitForTimeout(400);
      const slider = page.locator('input[type="range"][aria-label="Custom credit pack amount"]');
      results.tests.checkout.sliderVisible = (await slider.count()) > 0;
      if (results.tests.checkout.sliderVisible) {
        await slider.fill("20000");
        results.tests.checkout.sliderValue = await slider.inputValue();
        const bodyText = await page.locator("body").innerText();
        results.tests.checkout.has3200Price = /\$32\.00/.test(bodyText);
      }
    }
    await page.getByRole("button", { name: "Close checkout" }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // 5 Footer overlap + 6 captions
  results.tests.footerOverlap = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(200);
    results.tests.footerOverlap[width] = await page.evaluate(() => {
      const footer = document.querySelector("footer.editor-mobile-footer");
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
      return {
        footerFound: true,
        buySwapOverlap: buy && swap ? overlaps(buy, swap) : null,
        buttons: buttons.map((b) => ({
          label: b.label,
          left: Math.round(b.rect.left),
          width: Math.round(b.rect.width),
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
            display: styles.display,
          };
        })
      : [];
    return { zoomToolbarFound: Boolean(zoomToolbar), zoomCaptions };
  });

  // 2 Export login gate + scroll simulation
  await page.reload({ waitUntil: "networkidle" });
  await loadEditorWithBatch(page);
  const exportBtn = page.locator("footer button").filter({ hasText: /^Export/i }).first();
  if (await exportBtn.count()) {
    await exportBtn.click({ timeout: 8000 });
    await page.waitForTimeout(1500);
  }
  results.tests.exportGateVisible = (await page.getByRole("dialog").count()) > 0;
  results.tests.pageErrorsAfterExportClick = [...pageErrors];

  if (results.tests.exportGateVisible) {
    const email = page.locator('input[type="email"]').first();
    if (await email.count()) {
      await email.focus();
      await page.evaluate(() => {
        window.__scrollCrash = null;
        const el = document.querySelector('input[type="email"]');
        el?.remove();
        window.requestAnimationFrame(() => {
          try {
            el?.scrollIntoView({ block: "center" });
          } catch (error) {
            window.__scrollCrash = String(error);
          }
        });
      });
      await page.waitForTimeout(300);
      results.tests.rawScrollSimulationCrash = await page.evaluate(() => window.__scrollCrash);

      // Import helper in page context via exposed module isn't available; test via bundled path:
      // focus OTP input if we can reach it without signup
    }

    // Keyboard open simulation: focus password field
    const password = page.locator('input[type="password"]').first();
    if (await password.count()) {
      await password.focus();
      await page.waitForTimeout(300);
      const dialogBox = await page.getByRole("dialog").first().boundingBox();
      results.tests.keyboardFocusDialog = {
        dialogHeight: dialogBox?.height,
        dialogY: dialogBox?.y,
        viewportHeight: 844,
        dialogVisible: dialogBox ? dialogBox.y >= 0 && dialogBox.y + dialogBox.height <= 844 : false,
      };
    }
  }

  // 1 Batch forced watermark - attempt authenticated mock path
  await page.close();
  const page2 = await context.newPage();
  let downloadedZip = null;
  page2.on("download", async (download) => {
    try {
      downloadedZip = await download.createReadStream().then(async (stream) => {
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
      });
    } catch (error) {
      downloadedZip = { error: String(error) };
    }
  });

  await page2.route("**/api/export/authorize**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        balance: 0,
        chargedCredits: 0,
        exportId: "qa-batch-export",
        tier: "clean",
        upsellRequired: false,
      }),
    });
  });

  let billingCalled = false;
  await page2.route("**/api/export/finalize**", async (route) => {
    billingCalled = true;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "billing fail" }) });
  });

  await loadEditorWithBatch(page2);

  // Need Export All button - search batch UI
  const exportAll = page2.getByRole("button", { name: /Export All|Export all/i });
  results.tests.batch = {
    exportAllFound: (await exportAll.count()) > 0,
    billingCalled,
  };

  if (await exportAll.count()) {
    await exportAll.click({ timeout: 10000 }).catch((e) => {
      results.tests.batch.exportAllClickError = String(e);
    });
    await page2.waitForTimeout(8000);
    results.tests.batch.billingCalled = billingCalled;
    results.tests.batch.uploadError = await page2.locator("text=/could not export|failed/i").count();
    results.tests.batch.exportNotice = await page2.locator("body").innerText().then((t) =>
      t.includes("Export completed, but credits could not be deducted"),
    );

    if (downloadedZip && Buffer.isBuffer(downloadedZip)) {
      const zip = await JSZip.loadAsync(downloadedZip);
      const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
      results.tests.batch.zipFileCount = names.length;
      results.tests.batch.zipFiles = names;

      async function avgBrightness(name) {
        const buf = await zip.file(name).async("nodebuffer");
        // crude JPEG marker - use canvas in page
        return page2.evaluate(async (bytes) => {
          const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(120, bitmap.width);
          canvas.height = Math.min(120, bitmap.height);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
          return sum / (data.length / 4);
        }, [...buf]);
      }

      const brightness = {};
      for (const name of names.slice(0, 5)) {
        brightness[name] = await avgBrightness(name);
      }
      results.tests.batch.brightness = brightness;
      results.tests.batch.allImagesBrightEnoughForStamp = Object.values(brightness).every((v) => v > 40);
    } else {
      results.tests.batch.download = downloadedZip;
    }
  }

  results.pageErrors = pageErrors;
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
