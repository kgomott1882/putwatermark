"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CURSOR_SPRING: SpringOptions = {
  damping: 28,
  mass: 0.45,
  stiffness: 320,
};

const HOVER_SPRING: SpringOptions = {
  damping: 22,
  mass: 0.35,
  stiffness: 420,
};

export function CursorFollower() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const dotX = useSpring(pointerX, CURSOR_SPRING);
  const dotY = useSpring(pointerY, CURSOR_SPRING);

  useEffect(() => {
    if (!isLanding) {
      setIsEnabled(false);
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      setIsEnabled(finePointer.matches && !reducedMotion.matches);
    };

    syncEnabled();
    finePointer.addEventListener("change", syncEnabled);
    reducedMotion.addEventListener("change", syncEnabled);

    return () => {
      finePointer.removeEventListener("change", syncEnabled);
      reducedMotion.removeEventListener("change", syncEnabled);
    };
  }, [isLanding]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onMove = (event: MouseEvent) => {
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
      setIsVisible(true);
    };

    const onLeave = () => setIsVisible(false);
    const onEnter = () => setIsVisible(true);

    const onMouseOver = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      setIsHovering(
        Boolean(
          target.closest(
            "a, button, [role='button'], input, textarea, select, label, summary",
          ),
        ),
      );
    };

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    window.addEventListener("mouseover", onMouseOver);
    document.body.classList.add("landing-cursor-none");

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mouseover", onMouseOver);
      document.body.classList.remove("landing-cursor-none");
    };
  }, [isEnabled, pointerX, pointerY]);

  if (!isLanding || !isEnabled) {
    return null;
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[120]"
      style={{ x: dotX, y: dotY }}
    >
      <motion.span
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isHovering ? 1.45 : 1,
        }}
        className={`block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          isHovering ? "bg-signal" : "bg-paper"
        }`}
        transition={{
          opacity: { duration: 0.18, ease: "easeOut" },
          scale: { type: "spring", ...HOVER_SPRING },
        }}
      />
    </motion.div>
  );
}
