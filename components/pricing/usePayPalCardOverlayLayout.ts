"use client";

import { useEffect } from "react";
import {
  applyPayPalCardOverlayLayout,
  clearPayPalCardOverlayLayout,
} from "./paypalCardSheet";

export function usePayPalCardOverlayLayout(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    let frameId = 0;

    const scheduleLayout = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        applyPayPalCardOverlayLayout();
      });
    };

    scheduleLayout();

    const observer = new MutationObserver(scheduleLayout);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleLayout);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", scheduleLayout);
      clearPayPalCardOverlayLayout();
    };
  }, [active]);
}
