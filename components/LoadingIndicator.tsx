import { Loader2 } from "lucide-react";

type LoadingIndicatorProps = {
  className?: string;
  label: string;
  mutedClassName?: string;
  progress?: number | null;
  size?: "sm" | "md";
};

export function LoadingIndicator({
  className = "",
  label,
  mutedClassName = "text-beige-dim",
  progress = null,
  size = "md",
}: LoadingIndicatorProps) {
  const iconClassName = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  const labelClassName = size === "sm" ? "text-xs" : "text-sm";
  const showProgress = progress !== null && Number.isFinite(progress);
  const clampedProgress = showProgress
    ? Math.max(0, Math.min(100, Math.round(progress)))
    : 0;

  return (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${className}`}
      role="status"
    >
      <Loader2
        aria-hidden="true"
        className={`${iconClassName} animate-spin text-signal`}
      />
      <div className="flex w-full max-w-xs flex-col gap-2">
        <p className={`${labelClassName} leading-relaxed ${mutedClassName}`}>
          {showProgress ? `${label} ${clampedProgress}%` : label}
        </p>
        {showProgress ? (
          <div
            aria-hidden="true"
            className="h-1.5 overflow-hidden rounded-full bg-ed-panel/80"
          >
            <div
              className="h-full rounded-full bg-signal transition-[width] duration-300 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
