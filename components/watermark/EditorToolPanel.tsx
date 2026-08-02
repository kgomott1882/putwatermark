"use client";

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

const panelEase = [0.22, 1, 0.36, 1] as const;
const selectionSpring = { type: "spring" as const, stiffness: 380, damping: 32 };
const tapSpring = { type: "spring" as const, stiffness: 420, damping: 28 };

const activeSelectionClassName =
  "editor-active-surface rounded-lg";
const inactiveButtonClassName =
  "editor-secondary-button";

type EditorToolPanelProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  instant?: boolean;
  onClose: () => void;
  title: string;
  toolRail?: ReactNode;
};

export function EditorToolPanel({
  children,
  className = "",
  icon,
  instant = false,
  onClose,
  title,
  toolRail,
}: EditorToolPanelProps) {
  return (
    <aside
      className={`flex min-h-0 w-full flex-col bg-ed-panel max-md:min-h-0 max-md:flex-1 max-md:overflow-hidden md:h-full md:shrink-0 md:border-r md:border-ed-border ${
        toolRail ? "md:w-[24.5rem]" : "md:w-[19.5rem]"
      } ${className}`}
    >
      <header className="hidden shrink-0 items-center gap-1.5 border-b border-ed-border bg-ed-bg-card px-2.5 py-2 shadow-sm md:flex">
        <button
          aria-hidden
          className="editor-secondary-button flex h-6 w-6 items-center justify-center rounded-md text-ed-fg"
          tabIndex={-1}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          {icon ? (
            <span className="text-ed-fg">{icon}</span>
          ) : null}
          <h2 className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-ed-fg">
            {title}
          </h2>
        </div>
        <button
          aria-label={`Close ${title} panel`}
          className="editor-secondary-button flex h-6 w-6 items-center justify-center rounded-md text-ed-fg-muted hover:text-ed-fg"
          onClick={onClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {toolRail ? (
          <div className="z-10 flex shrink-0 flex-col border-b border-ed-border bg-ed-panel md:overflow-y-auto md:border-b-0">
            {toolRail}
          </div>
        ) : null}
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-1.5 md:px-2.5 md:py-2"
          initial={instant ? false : { opacity: 0, x: 14 }}
          transition={instant ? { duration: 0 } : { duration: 0.38, ease: panelEase }}
        >
          {children}
        </motion.div>
      </div>
    </aside>
  );
}

type EditorPanelSectionProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function EditorPanelSection({
  children,
  className = "",
  title,
}: EditorPanelSectionProps) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-1 ${className}`}
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: panelEase }}
    >
      {title ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
          {title}
        </p>
      ) : null}
      {children}
    </motion.section>
  );
}

type EditorCardProps = {
  children: ReactNode;
  className?: string;
};

export function EditorCard({ children, className = "" }: EditorCardProps) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border border-ed-border bg-ed-bg-card p-1.5 shadow-sm ${className}`}
      initial={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: panelEase }}
    >
      {children}
    </motion.div>
  );
}

type EditorSegmentProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
  groupId?: string;
  onClick: () => void;
};

export function EditorSegment({
  active,
  children,
  className = "",
  groupId,
  onClick,
}: EditorSegmentProps) {
  return (
    <motion.button
      aria-pressed={active}
      className={`relative rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] transition-all ${
        active ? "font-bold text-ed-fg" : "text-ed-fg-muted hover:bg-ed-bg/70 hover:text-ed-fg"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className={`absolute inset-0 ${activeSelectionClassName}`}
          layoutId={`${groupId}-selection`}
          transition={selectionSpring}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

type EditorPillProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
  groupId?: string;
  onClick: () => void;
};

export function EditorPill({
  active,
  children,
  className = "",
  groupId,
  onClick,
}: EditorPillProps) {
  return (
    <motion.button
      aria-pressed={active}
      className={`relative rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
        active
          ? "border-signal font-semibold text-ed-fg"
          : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className={`absolute inset-0 rounded-md ${activeSelectionClassName}`}
          layoutId={`${groupId}-selection`}
          transition={selectionSpring}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

type EditorGridChoiceProps = {
  active: boolean;
  ariaLabel: string;
  className?: string;
  groupId?: string;
  onClick: () => void;
};

export function EditorGridChoice({
  active,
  ariaLabel,
  className = "",
  groupId,
  onClick,
}: EditorGridChoiceProps) {
  return (
    <motion.button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`relative h-7 rounded border text-[11px] transition-all ${
        active
          ? "border-signal font-semibold text-ed-fg"
          : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className={`absolute inset-0 rounded-md ${activeSelectionClassName}`}
          layoutId={`${groupId}-selection`}
          transition={selectionSpring}
        />
      ) : null}
      <span className="sr-only">{ariaLabel}</span>
    </motion.button>
  );
}

type EditorApplyButtonProps = {
  children?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function EditorApplyButton({
  children = "Apply",
  disabled,
  onClick,
}: EditorApplyButtonProps) {
  return (
    <motion.button
      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={tapSpring}
    >
      <span aria-hidden>✓</span>
      {children}
    </motion.button>
  );
}

type EditorToggleRowProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

export function EditorToggleRow({
  checked,
  label,
  onChange,
}: EditorToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ed-border py-1 last:border-b-0">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg">
        {label}
      </span>
      <motion.button
        aria-pressed={checked}
        className={`relative h-5 w-9 rounded-full border shadow-sm transition-colors ${
          checked
            ? "border-signal bg-signal ring-2 ring-signal/25"
            : "border-ed-border bg-ed-bg-card"
        }`}
        onClick={onChange}
        type="button"
        whileTap={{ scale: 0.94 }}
        transition={tapSpring}
      >
        <motion.span
          animate={{ left: checked ? "1.125rem" : "0.125rem" }}
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm ${
            checked ? "bg-white" : "bg-ed-fg"
          }`}
          transition={selectionSpring}
        />
      </motion.button>
    </div>
  );
}
