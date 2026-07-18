"use client";

import { useEffect } from "react";
import { buildGoogleFontsStylesheetUrls } from "@/lib/watermarkFonts";

export function WatermarkFontLoader() {
  useEffect(() => {
    const links = buildGoogleFontsStylesheetUrls().map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      return link;
    });

    return () => {
      for (const link of links) {
        link.remove();
      }
    };
  }, []);

  return null;
}
