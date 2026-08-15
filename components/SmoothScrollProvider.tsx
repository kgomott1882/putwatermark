"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

function shouldUseSmoothScroll(pathname: string) {
  if (typeof window === "undefined") {
    return false;
  }

  if (pathname === "/watermark" || pathname.startsWith("/watermark/")) {
    return false;
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    return false;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  return true;
}

export function SmoothScrollProvider({
  children,
}: SmoothScrollProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    if (!shouldUseSmoothScroll(pathname)) {
      return;
    }

    const lenis = new Lenis();
    let frameId: number;

    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [pathname]);

  return children;
}
