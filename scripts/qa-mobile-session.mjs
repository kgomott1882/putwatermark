const { chromium, devices } = require('playwright');

const iPhone = devices['iPhone 13'];
const widths = [375, 390, 414];

async function fetchProdMarker() {
  const res = await fetch('https://www.putwatermark.com/watermark');
  const html = await res.text();
  const markers = {
    customPlan: html.includes('Custom plan') || html.includes('customPlan'),
    scrollInputIntoView: html.includes('scrollInputIntoView'),
    editorFooterMobileAction: html.includes('EditorFooterMobileAction'),
  };
  // also scan linked scripts
  const scriptUrls = [...html.matchAll(/\/_next\/static\/[^\"']+\.js/g)].slice(0, 8).map(m => 'https://www.putwatermark.com' + m[0]);
  let scriptHits = { customPlan: false, growDefault: false, scrollHelper: false };
  for (const url of scriptUrls) {
    try {
      const js = await (await fetch(url)).text();
      if (js.includes('Custom plan')) scriptHits.customPlan = true;
      if (js.includes('scrollInputIntoViewOnMobile')) scriptHits.scrollHelper = true;
      if (js.includes('useState("grow")') || js.includes('selectedTierId') && js.includes('"grow"')) scriptHits.growDefault = true;
    } catch {}
  }
  return { htmlLength: html.length, markers, scriptHits, scriptCount: scriptUrls.length };
}

(async () => {
  const results = {};
  results.production = await fetchProdMarker();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // 3) Mobile load behavior
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const landingScroll = await page.evaluate(() => ({ scrollY: window.scrollY, docEl: document.documentElement.scrollTop, body: document.body.scrollTop }));
  await page.goto('http://localhost:3000/watermark', { waitUntil: 'networkidle' });
  const editorScroll = await page.evaluate(() => ({ scrollY: window.scrollY, docEl: document.documentElement.scrollTop, body: document.body.scrollTop }));

  results.mobileLoad = { landingScroll, editorScroll };

  // 2) Export login OTP scrollIntoView crash simulation
  await page.evaluate(() => {
    window.__scrollCalls = 0;
    Element.prototype.scrollIntoView = function() { window.__scrollCalls += 1; };
  });
  // open export gate by setting state isn't easy; simulate helper directly
  const scrollCrash = await page.evaluate(async () => {
    const mod = await import('/src/lib/scrollInputIntoView.ts').catch(() => null);
    return { importOk: Boolean(mod) };
  });
  results.scrollModuleImportInBrowser = scrollCrash;

  // Trigger ExportLoginGate by clicking export without auth - need media first
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles([
    'c:/PutWatermark/public/Pics/hero-portrait.jpg',
    'c:/PutWatermark/public/Kim.png',
  ]);
  await page.waitForTimeout(2500);

  // try export
  const exportBtn = page.locator('footer button', { hasText: /Export/i }).first();
  if (await exportBtn.count()) {
    await exportBtn.click({ timeout: 5000 }).catch(e => results.exportClickError = String(e));
    await page.waitForTimeout(1500);
  }

  const gateVisible = await page.getByRole('dialog').count();
  results.exportGate = { gateVisible, consoleErrors: [...consoleErrors] };

  if (gateVisible) {
    // focus email field then remove it like OTP switch
    const email = page.locator('input[type="email"]').first();
    if (await email.count()) {
      await email.focus();
      await page.evaluate(() => {
        const el = document.querySelector('input[type="email"]');
        if (el) el.remove();
        window.requestAnimationFrame(() => {
          try { el.scrollIntoView({ block: 'center' }); } catch (e) { window.__otpScrollError = String(e); }
        });
      });
      await page.waitForTimeout(300);
    }
    // signup tab + fill to reach OTP if possible
    const signupTab = page.getByRole('button', { name: 'Sign up' });
    if (await signupTab.count()) await signupTab.click();
    results.otpFlow = { signupTab: await signupTab.count() };
  }

  // 4) In-editor checkout UI - open Buy if present
  const buyBtn = page.getByRole('button', { name: /Buy/i }).first();
  results.checkout = {};
  if (await buyBtn.count()) {
    await buyBtn.click().catch(e => results.checkout.buyClickError = String(e));
    await page.waitForTimeout(1000);
    const tierSelect = page.locator('select[id$="-tier"]');
    results.checkout.tierSelectVisible = await tierSelect.count() > 0;
    if (results.checkout.tierSelectVisible) {
      results.checkout.defaultTier = await tierSelect.inputValue();
      const options = await tierSelect.locator('option').allTextContents();
      results.checkout.options = options;
    }
    const customSummary = page.getByText('Custom plan', { exact: true });
    results.checkout.customPlanVisible = await customSummary.count() > 0;
    if (results.checkout.customPlanVisible) {
      await customSummary.click();
      await page.waitForTimeout(500);
      const slider = page.locator('input[type="range"][aria-label="Custom credit pack amount"]');
      results.checkout.sliderVisible = await slider.count() > 0;
      if (results.checkout.sliderVisible) {
        await slider.fill('20000');
        results.checkout.sliderValue = await slider.inputValue();
        results.checkout.priceText = await page.locator('text=/\\$32\\.00|\\$31\\.|\\$32/').count();
      }
    }
  } else {
    results.checkout.buyNotFound = true;
  }

  // 5) Footer overlap at widths
  results.footerOverlap = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.waitForTimeout(200);
    const boxes = await page.evaluate(() => {
      const footer = document.querySelector('footer.editor-mobile-footer');
      if (!footer) return null;
      const btns = [...footer.querySelectorAll('button')].map(b => ({ label: b.getAttribute('aria-label') || b.textContent?.trim(), rect: b.getBoundingClientRect() }));
      const buy = btns.find(b => (b.label || '').includes('Buy') || b.label === 'Buy credits');
      const swap = btns.find(b => (b.label || '').includes('Replace') || (b.label || '').includes('Swap'));
      function overlap(a, b) {
        if (!a || !b) return false;
        return !(a.rect.right <= b.rect.left || b.rect.right <= a.rect.left || a.rect.bottom <= b.rect.top || b.rect.bottom <= a.rect.top);
      }
      return { btns: btns.map(b => ({ label: b.label, x: Math.round(b.rect.x), w: Math.round(b.rect.width) })), buySwapOverlap: overlap(buy, swap) };
    });
    results.footerOverlap[w] = boxes;
  }

  // 6) Caption visibility on checkerboard
  results.captions = await page.evaluate(() => {
    const zoomToolbar = document.querySelector('[aria-label="Canvas zoom controls"]');
    const caps = zoomToolbar ? [...zoomToolbar.querySelectorAll('span')].map(s => ({
      text: s.textContent?.trim(),
      color: getComputedStyle(s).color,
      fontSize: getComputedStyle(s).fontSize,
      visible: s.offsetParent !== null || getComputedStyle(s).display !== 'none',
    })) : [];
    return { zoomCaptions: caps, zoomToolbarFound: Boolean(zoomToolbar) };
  });

  results.consoleErrors = consoleErrors;
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
