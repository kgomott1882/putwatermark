/** iOS Safari auto-zooms focused inputs when computed font-size is below 16px. */
export const MOBILE_INPUT_NO_ZOOM_CLASS = "editor-mobile-input-no-zoom";

export function resetMobileEditorViewportZoom() {
  if (typeof window === "undefined" || window.innerWidth >= 768) {
    return;
  }

  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    active.blur();
  }

  window.scrollTo(0, 0);

  const meta = document.querySelector('meta[name="viewport"]');

  if (!meta) {
    return;
  }

  const original = meta.getAttribute("content") ?? "";

  if (original.includes("maximum-scale=1")) {
    return;
  }

  meta.setAttribute(
    "content",
    `${original}${original.length ? ", " : ""}maximum-scale=1`,
  );

  window.requestAnimationFrame(() => {
    meta.setAttribute("content", original);
  });
}
