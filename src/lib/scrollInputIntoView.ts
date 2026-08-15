export function scrollInputIntoViewOnMobile(
  element: HTMLElement | null | undefined,
) {
  if (!element || window.innerWidth >= 768) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!element.isConnected) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
}
