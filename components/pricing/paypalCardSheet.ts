function isPayPalOverlayRoot(element: HTMLElement) {
  if (window.getComputedStyle(element).position !== "fixed") {
    return false;
  }

  const zIndex = Number.parseInt(window.getComputedStyle(element).zIndex, 10);

  if (!Number.isFinite(zIndex) || zIndex < 100) {
    return false;
  }

  const iframe = element.querySelector("iframe");

  if (iframe) {
    const name = iframe.name.toLowerCase();
    const title = (iframe.title ?? "").toLowerCase();
    const src = (iframe.src ?? "").toLowerCase();

    return (
      name.includes("zoid") ||
      name.includes("paypal") ||
      title.includes("paypal") ||
      src.includes("paypal.com")
    );
  }

  return Boolean(
    element.querySelector('[class*="paypal"], [id*="paypal"], [data-namespace*="paypal"]'),
  );
}

function getPayPalOverlayRoots() {
  return Array.from(document.body.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && isPayPalOverlayRoot(child),
  );
}

function isInlinePayPalCardExpanded() {
  const host = document.querySelector(".paypal-checkout-host");

  if (!host) {
    return false;
  }

  return Array.from(host.querySelectorAll("iframe")).some(
    (iframe) => iframe.getBoundingClientRect().height > 160,
  );
}

export function isPayPalCardSheetOpen() {
  return getPayPalOverlayRoots().length > 0 || isInlinePayPalCardExpanded();
}

function clickPayPalCloseButton(root: ParentNode) {
  for (const button of Array.from(root.querySelectorAll("button"))) {
    const ariaLabel = (button.getAttribute("aria-label") ?? "").toLowerCase();
    const title = (button.getAttribute("title") ?? "").toLowerCase();

    if (
      ariaLabel.includes("close") ||
      title.includes("close") ||
      button.className.toLowerCase().includes("close")
    ) {
      button.click();
      return true;
    }
  }

  return false;
}

function clickPayPalOverlayBackdrop(overlay: HTMLElement) {
  const iframe = overlay.querySelector("iframe");
  const panel =
    iframe?.parentElement instanceof HTMLElement ? iframe.parentElement : overlay;
  const rect = panel.getBoundingClientRect();
  const target = document.elementFromPoint(
    Math.max(8, rect.left - 12),
    Math.max(8, rect.top + Math.min(rect.height / 2, 120)),
  );

  if (target instanceof HTMLElement && overlay.contains(target) && target !== panel) {
    target.click();
    return true;
  }

  overlay.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: Math.max(8, rect.left - 12),
      clientY: Math.max(8, rect.top + 24),
    }),
  );
  overlay.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      clientX: Math.max(8, rect.left - 12),
      clientY: Math.max(8, rect.top + 24),
    }),
  );
  overlay.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: Math.max(8, rect.left - 12),
      clientY: Math.max(8, rect.top + 24),
    }),
  );

  return true;
}

export function minimizePayPalCardSheet() {
  const overlays = getPayPalOverlayRoots();

  for (const overlay of overlays) {
    if (clickPayPalCloseButton(overlay)) {
      return true;
    }

    if (clickPayPalOverlayBackdrop(overlay)) {
      return true;
    }
  }

  const host = document.querySelector(".paypal-checkout-host");

  if (host && clickPayPalCloseButton(host)) {
    return true;
  }

  return false;
}

export function applyPayPalCardOverlayLayout() {
  const viewportPaddingY = Math.max(
    28,
    Math.round(window.innerHeight * 0.06),
  );
  const viewportPaddingX = Math.max(
    16,
    Math.round(window.innerWidth * 0.04),
  );
  const maxPanelHeight = window.innerHeight - viewportPaddingY * 2;
  const maxPanelWidth = Math.min(window.innerWidth - viewportPaddingX * 2, 448);

  for (const child of getPayPalOverlayRoots()) {
    child.dataset.putwatermarkPaypalOverlay = "true";
    child.style.setProperty("display", "flex", "important");
    child.style.setProperty("align-items", "center", "important");
    child.style.setProperty("justify-content", "center", "important");
    child.style.setProperty(
      "padding",
      `${viewportPaddingY}px ${viewportPaddingX}px`,
      "important",
    );
    child.style.setProperty("box-sizing", "border-box", "important");
    child.style.setProperty("overflow-y", "auto", "important");

    const iframe = child.querySelector("iframe");
    const panel =
      iframe?.parentElement instanceof HTMLElement ? iframe.parentElement : child;

    panel.style.setProperty("width", `${maxPanelWidth}px`, "important");
    panel.style.setProperty("max-width", "100%", "important");
    panel.style.setProperty("max-height", `${maxPanelHeight}px`, "important");
    panel.style.setProperty("overflow-y", "auto", "important");
    panel.style.setProperty("overflow-x", "hidden", "important");
    panel.style.setProperty("border-radius", "1rem", "important");
    panel.style.setProperty("margin", "auto", "important");
    panel.style.setProperty("-webkit-overflow-scrolling", "touch");

    if (iframe instanceof HTMLIFrameElement) {
      iframe.style.setProperty("display", "block", "important");
      iframe.style.setProperty("width", "100%", "important");
      iframe.style.removeProperty("max-height");
      iframe.style.removeProperty("height");
    }
  }
}

export function clearPayPalCardOverlayLayout() {
  for (const element of Array.from(
    document.querySelectorAll('[data-putwatermark-paypal-overlay="true"]'),
  )) {
    if (element instanceof HTMLElement) {
      element.removeAttribute("data-putwatermark-paypal-overlay");
    }
  }
}
