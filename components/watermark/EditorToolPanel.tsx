"use client";

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

const panelEase = [0.22, 1, 0.36, 1] as const;
const selectionSpring = { type: "spring" as const, stiffness: 380, damping: 32 };
const tapSpring = { type: "spring" as const, stiffness: 420, damping: 28 };

type EditorToolPanelProps = {
  children: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  title: string;
};

export function EditorToolPanel({
  children,
  icon,
  onClose,
  title,
}: EditorToolPanelProps) {
  return (
    <aside className="flex h-full w-[22rem] shrink-0 flex-col border-r border-editor-panel-border bg-editor-panel shadow-[inset_-1px_0_0_rgba(255,255,255,0.5)]">
      <header className="flex items-center gap-2 border-b border-editor-panel-border bg-editor-panel-header px-3 py-2.5">
        <button
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-lg text-editor-muted transition hover:bg-white/60"
          tabIndex={-1}
          type="button"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {icon ? (
            <span className="text-editor-ink/80">{icon}</span>
          ) : null}
          <h2 className="truncate text-xs font-bold uppercase tracking-[0.18em] text-editor-ink">
            {title}
          </h2>
        </div>
        <button
          aria-label={`Close ${title} panel`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-editor-muted transition hover:bg-white/60 hover:text-editor-ink"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        initial={{ opacity: 0, x: 14 }}
        key={title}
        transition={{ duration: 0.38, ease: panelEase }}
      >
        {children}
      </motion.div>
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
      className={`space-y-2 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.32, ease: panelEase }}
    >
      {title ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-editor-muted">
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
      className={`rounded-xl border border-white/70 bg-white/85 p-2.5 shadow-sm ${className}`}
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
      className={`relative rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-colors ${
        active ? "text-white" : "text-editor-muted hover:text-editor-ink"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className="absolute inset-0 rounded-xl border border-signal bg-signal shadow-md"
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
      className={`relative rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-signal text-white"
          : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className="absolute inset-0 rounded-full border border-signal bg-signal"
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
      className={`relative h-7 rounded-md border text-xs transition-colors ${
        active
          ? "border-signal text-white"
          : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
      } ${className}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={tapSpring}
    >
      {active && groupId ? (
        <motion.span
          className="absolute inset-0 rounded-md border border-signal bg-signal"
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
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-editor-accent px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex items-center justify-between gap-3 border-b border-editor-panel-border/70 py-2 last:border-b-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-editor-muted">
        {label}
      </span>
      <motion.button
        aria-pressed={checked}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-signal" : "bg-editor-panel-header"
        }`}
        onClick={onChange}
        type="button"
        whileTap={{ scale: 0.94 }}
        transition={tapSpring}
      >
        <motion.span
          animate={{ left: checked ? "1.35rem" : "0.125rem" }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          transition={selectionSpring}
        />
      </motion.button>
    </div>
  );
}
