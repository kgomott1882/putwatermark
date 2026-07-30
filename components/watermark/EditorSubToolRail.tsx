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
      className="flex w-[5rem] shrink-0 flex-col border-r border-ed-border bg-ed-panel py-2"
    >
      <div className="flex flex-col gap-1 px-1.5">{children}</div>
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
      className={`flex w-full flex-col items-center gap-2 rounded-xl px-1.5 py-3 text-[10px] leading-tight transition disabled:cursor-not-allowed ${
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
        className={`flex h-6 w-6 items-center justify-center ${
          disabled ? "text-ed-fg-muted/50" : "text-signal"
        }`}
      >
        {icon}
      </span>
      <span className="text-center">{label}</span>
    </button>
  );
}
