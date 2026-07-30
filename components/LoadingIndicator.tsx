import { Loader2 } from "lucide-react";

type LoadingIndicatorProps = {
  className?: string;
  label: string;
  mutedClassName?: string;
  size?: "sm" | "md";
};

export function LoadingIndicator({
  className = "",
  label,
  mutedClassName = "text-beige-dim",
  size = "md",
}: LoadingIndicatorProps) {
  const iconClassName = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  const labelClassName = size === "sm" ? "text-xs" : "text-sm";

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
      <p className={`${labelClassName} leading-relaxed ${mutedClassName}`}>{label}</p>
    </div>
  );
}
