/**
 * Caption legibility over checkerboard background.
 */
const { chromium, devices } = require("playwright");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();

  await page.goto("http://localhost:3000/watermark", { waitUntil: "networkidle" });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(process.cwd(), "public/Pics/hero-portrait.jpg"));
  await page.waitForTimeout(4000);

  const result = await page.evaluate(() => {
    function captionContrast(captionEl) {
      const captionRect = captionEl.getBoundingClientRect();
      const cx = captionRect.left + captionRect.width / 2;
      const cy = captionRect.top + captionRect.height / 2;
      const elements = document.elementsFromPoint(cx, cy);
      const checker = elements.find((el) =>
        el.classList?.contains("preview-checkerboard"),
      );
      const styles = getComputedStyle(captionEl);
      const color = styles.color;
      const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
      const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
      return {
        text: captionEl.textContent?.trim(),
        color,
        luminance,
        overCheckerboard: Boolean(checker),
        fontSize: styles.fontSize,
      };
    }

    const zoomToolbar = document.querySelector('[aria-label="Canvas zoom controls"]');
    const zoomCaptions = zoomToolbar
      ? [...zoomToolbar.querySelectorAll("span")].map(captionContrast)
      : [];

    const footerCaptions = [...document.querySelectorAll("footer span")]
      .filter((s) => (s.textContent?.trim()?.length ?? 0) <= 12)
      .map(captionContrast);

    return { zoomCaptions, footerCaptions };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
