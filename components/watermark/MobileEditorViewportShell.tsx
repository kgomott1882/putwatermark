"use client";

import { type ReactNode, useEffect } from "react";

type MobileEditorViewportShellProps = {
  children: ReactNode;
};

export function MobileEditorViewportShell({
  children,
}: MobileEditorViewportShellProps) {
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (!isMobile) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyWidth = body.style.width;
    const previousBodyTop = body.style.top;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = "0";
    window.scrollTo(0, 0);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.width = previousBodyWidth;
      body.style.top = previousBodyTop;
    };
  }, []);

  return children;
}
