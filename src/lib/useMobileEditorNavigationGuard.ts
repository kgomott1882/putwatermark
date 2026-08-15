"use client";

import { useCallback, useEffect, useRef } from "react";

type UseMobileEditorNavigationGuardOptions = {
  enabled: boolean;
  onNavigateAway: () => void;
};

export function useMobileEditorNavigationGuard({
  enabled,
  onNavigateAway,
}: UseMobileEditorNavigationGuardOptions) {
  const allowNavigationRef = useRef(false);
  const onNavigateAwayRef = useRef(onNavigateAway);

  useEffect(() => {
    onNavigateAwayRef.current = onNavigateAway;
  }, [onNavigateAway]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (!isMobile) {
      return;
    }

    window.history.pushState({ editorGuard: true }, "");

    function handlePopState() {
      if (allowNavigationRef.current) {
        return;
      }

      window.history.pushState({ editorGuard: true }, "");
      onNavigateAwayRef.current();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);

  const allowNavigation = useCallback(() => {
    allowNavigationRef.current = true;
  }, []);

  return { allowNavigation };
}
