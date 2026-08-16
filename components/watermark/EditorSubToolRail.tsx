"use client";

import type { ReactNode } from "react";

export type EditorSubToolRailProps = {
  ariaLabel: string;
  children: ReactNode;
  mobileTrailingAccessory?: ReactNode;
};

export type EditorSubToolButtonProps = {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  mobileLabel?: string;
  onClick: () => void;
};

const SUB_TOOL_RAIL_EDGE_INSET_X = "px-4 sm:px-5 md:px-2.5";

export function EditorSubToolRail({
  ariaLabel,
  children,
  mobileTrailingAccessory,
}: EditorSubToolRailProps) {
  return (
    <div className="relative">
      <nav
        aria-label={ariaLabel}
        className={`pointer-events-auto flex min-w-0 w-full shrink-0 flex-row gap-0.5 overflow-x-auto overscroll-x-contain bg-ed-panel py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:w-[5rem] md:flex-col md:gap-1 md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:py-2 [&::-webkit-scrollbar]:hidden ${SUB_TOOL_RAIL_EDGE_INSET_X} ${
          mobileTrailingAccessory ? "max-md:pr-[4.5rem]" : ""
        }`}
      >
        <div className="flex flex-row gap-0.5 md:flex-col md:gap-1">{children}</div>
      </nav>
      {mobileTrailingAccessory ? (
        <div className="pointer-events-auto absolute right-4 top-1 z-10 flex items-start gap-0.5 sm:right-5 md:hidden">
          {mobileTrailingAccessory}
        </div>
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
      className={`flex shrink-0 touch-manipulation flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[9px] leading-tight transition disabled:cursor-not-allowed md:w-full md:gap-2 md:rounded-xl md:px-1.5 md:py-3 md:text-[10px] ${
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
      <span className="hidden w-full max-w-[4.25rem] text-balance text-center text-[9px] leading-[1.15] md:inline">
        {label}
      </span>
    </button>
  );
}
