"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type EditorSubToolRailProps = {
  ariaLabel: string;
  children: ReactNode;
  onMobileExit?: () => void;
};

export type EditorSubToolButtonProps = {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  mobileLabel?: string;
  onClick: () => void;
};

export function EditorSubToolRail({
  ariaLabel,
  children,
  onMobileExit,
}: EditorSubToolRailProps) {
  return (
    <div className="relative">
      <nav
        aria-label={ariaLabel}
        className={`flex min-w-0 w-full shrink-0 flex-row gap-0.5 overflow-x-auto overscroll-x-contain bg-ed-panel px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:w-[5rem] md:flex-col md:gap-1 md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:px-1.5 md:py-2 [&::-webkit-scrollbar]:hidden ${
          onMobileExit ? "max-md:pr-8" : ""
        }`}
      >
        <div className="flex flex-row gap-0.5 md:flex-col md:gap-1">{children}</div>
      </nav>
      {onMobileExit ? (
        <button
          aria-label="Exit editor"
          className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-ed-border/80 bg-ed-panel/95 text-ed-fg-muted shadow-sm backdrop-blur-[2px] transition hover:bg-ed-bg-card hover:text-ed-fg md:hidden"
          onClick={onMobileExit}
          type="button"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

export function EditorSubToolButton({
  active,
  disabled = false,
  icon,
  label,
  mobileLabel,
  onClick,
}: EditorSubToolButtonProps) {
  const compactLabel = mobileLabel ?? label;

  return (
    <button
      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[9px] leading-tight transition disabled:cursor-not-allowed md:w-full md:gap-2 md:rounded-xl md:px-1.5 md:py-3 md:text-[10px] ${
        active
          ? "editor-selected-pill"
          : disabled
            ? "font-medium text-ed-fg-muted opacity-35"
            : "font-bold text-ed-fg hover:bg-ed-bg-card/70"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center md:h-6 md:w-6 ${
          disabled ? "text-ed-fg-muted/50" : "text-signal"
        }`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap text-center md:hidden">{compactLabel}</span>
      <span className="hidden whitespace-nowrap text-center md:inline">{label}</span>
    </button>
  );
}
