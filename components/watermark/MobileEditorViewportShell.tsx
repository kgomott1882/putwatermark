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

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return children;
}
