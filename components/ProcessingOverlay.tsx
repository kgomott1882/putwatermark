import { LoadingIndicator } from "./LoadingIndicator";

type ProcessingOverlayProps = {
  className?: string;
  label: string;
  progress?: number | null;
};

export function ProcessingOverlay({
  className = "",
  label,
  progress = null,
}: ProcessingOverlayProps) {
  return (
    <div
      aria-live="polite"
      className={`absolute inset-0 z-30 flex items-center justify-center bg-ed-fg/45 backdrop-blur-[2px] ${className}`}
      role="status"
    >
      <LoadingIndicator
        label={label}
        mutedClassName="text-white"
        progress={progress}
      />
    </div>
  );
}
