"use client";

import type { ReactNode } from "react";

export type EditorSubToolRailProps = {
  ariaLabel: string;
  children: ReactNode;
};

export type EditorSubToolButtonProps = {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function EditorSubToolRail({ ariaLabel, children }: EditorSubToolRailProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto overscroll-x-contain border-b border-ed-border bg-ed-panel px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] md:w-[5rem] md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:py-2 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex flex-row gap-1 md:flex-col">{children}</div>
    </nav>
  );
}

export function EditorSubToolButton({
  active,
  disabled = false,
  icon,
  label,
  onClick,
}: EditorSubToolButtonProps) {
  return (
    <button
      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] leading-tight transition disabled:cursor-not-allowed md:w-full md:gap-2 md:px-1.5 md:py-3 ${
        active
          ? "bg-ed-bg-card text-ed-fg font-bold shadow-sm"
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
      <span className="whitespace-nowrap text-center">{label}</span>
    </button>
  );
}
