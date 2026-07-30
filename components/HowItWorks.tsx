"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Download,
  Droplet,
  Grip,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, type ReactNode, useRef, useState } from "react";
import { stashEditorHandoffFiles } from "@/lib/editorFileHandoff";
import {
  acceptedMediaInputTypes,
  validateMediaFiles,
} from "@/lib/mediaFiles";
import { BentoDotGrid, DotGrid, LandingHighlight, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

type Step = {
  label: string;
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  Visual: () => ReactNode;
};

const steps: Step[] = [
  {
    number: "01",
    label: "upload",
    title: "Upload",
    description:
      "Drop in a photo, PDF, or video, right from your device. No account needed to start.",
    Icon: Upload,
    Visual: UploadVisual,
  },
  {
    number: "02",
    label: "watermark",
    title: "Watermark",
    description:
      "Add your text or logo, drag it into place, and adjust opacity, tiling, and styling live.",
    Icon: Droplet,
    Visual: WatermarkVisual,
  },
  {
    number: "03",
    label: "export",
    title: "Export",
    description:
      "Download instantly at full resolution. Free to start, with upgrade options for heavier use.",
    Icon: Download,
    Visual: ExportVisual,
  },
];

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="landing-section">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          index="001"
          lead={
            <>
              Designed for speed, built to help you{" "}
              <LandingHighlight>watermark and export</LandingHighlight> with less friction.
            </>
          }
          title="How it works"
        />

        <div className="landing-border mt-16 overflow-hidden rounded-2xl border">
          <div className="flex min-h-[28rem] flex-col lg:min-h-[32rem] lg:flex-row">
            {steps.map((step, index) => {
              const isActive = activeIndex === index;
              const StepVisual = step.Visual;

              return (
                <motion.div
                  key={step.number}
                  animate={{
                    flexGrow: isActive ? 2.6 : 0.55,
                    flexBasis: isActive ? "34%" : "4.5rem",
                  }}
                  className={`relative flex min-h-[5.5rem] min-w-0 flex-col landing-border border-b last:border-b-0 lg:min-h-0 lg:border-b-0 lg:border-r ${
                    isActive ? "bg-signal" : "cursor-pointer bg-night-card"
                  }`}
                  initial={false}
                  layout
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveIndex(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                >
                  {isActive ? (
                    <div className="flex h-full flex-col p-6 md:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <ArrowUpRight
                          className="h-5 w-5 shrink-0 text-white/85"
                          strokeWidth={2}
                        />
                        <span className="text-5xl font-bold tracking-[-0.08em] text-white/95 md:text-6xl">
                          {step.number}
                        </span>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-2xl font-bold text-white md:text-[1.75rem]">
                          {step.title}
                        </h3>
                        <p className="mt-3 max-w-md text-sm leading-7 text-white/85 md:text-[0.95rem]">
                          {step.description}
                        </p>
                      </div>

                      <div className="my-6 flex flex-1 items-center justify-center">
                        <div className="w-full max-w-[16rem] overflow-hidden rounded-2xl border border-beige/15 bg-night/40 shadow-lg md:max-w-[18rem]">
                          <StepVisual />
                        </div>
                      </div>

                      <div className="mt-auto flex justify-end">
                        <BentoDotGrid />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[5.5rem] flex-row items-stretch lg:min-h-0 lg:flex-col lg:items-center lg:justify-between lg:px-3 lg:py-8">
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 landing-border border-r px-3 py-4 lg:w-full lg:flex-none lg:border-b lg:border-r-0 lg:pb-6 lg:pt-0">
                        <ArrowDown
                          className="landing-soft hidden h-4 w-4 lg:block"
                          strokeWidth={2}
                        />
                        <span className="landing-soft text-3xl font-bold tracking-[-0.08em] lg:text-4xl">
                          {step.number}
                        </span>
                        <div className="hidden h-px w-8 bg-beige/10 lg:block" />
                      </div>
                      <div className="flex flex-[2] items-center px-4 py-4 lg:flex-none lg:items-end lg:justify-center lg:px-0 lg:pb-2 lg:pt-0">
                        <span className="landing-soft text-sm lowercase tracking-[0.04em] lg:[writing-mode:vertical-rl] lg:rotate-180">
                          {step.label}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            <div className="flex min-w-0 flex-[1.35] flex-col bg-night-card p-6 md:p-8 lg:min-w-[18rem]">
              <div className="flex items-center justify-between gap-4 landing-border border-b pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand">
                  Core workflow
                </p>
                <p className="landing-soft text-sm font-medium">3/3</p>
              </div>

              <h3 className="mt-6 text-2xl font-bold leading-tight tracking-[-0.04em] text-beige md:text-3xl">
                Upload, watermark, and export without leaving your browser.
              </h3>
              <p className="landing-muted mt-4 text-sm leading-7 md:text-[0.95rem]">
                Every step stays local, fast, and simple. PutWatermark&apos;s key workflow
                includes:
              </p>

              <div className="my-auto py-8">
                <DotGrid active={2} />
              </div>

              <div className="mt-auto flex items-center justify-between gap-4">
                <div className="landing-muted flex items-center gap-3 text-sm">
                  <Grip className="h-4 w-4 text-signal" strokeWidth={2} />
                  <span>Upload, customize, and export.</span>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-sand transition hover:text-signal"
                  href="/watermark"
                >
                  Open editor
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadVisual() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  async function openInEditor(files: File[]) {
    const validation = validateMediaFiles(files);

    if (!validation.ok) {
      setErrorMessage(validation.error);
      return;
    }

    setErrorMessage("");
    setIsOpening(true);

    try {
      await stashEditorHandoffFiles(validation.files);
      router.push("/watermark");
    } catch {
      setErrorMessage("Could not open the editor with that file. Try again.");
      setIsOpening(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    void openInEditor(
      Array.from(
        (event.dataTransfer as unknown as { files: FileList }).files,
      ),
    );
  }

  return (
    <div className="relative aspect-[4/5] bg-[linear-gradient(160deg,#1a1f24,#36454f)]">
      <div
        aria-busy={isOpening}
        className={`absolute inset-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition ${
          isDragging
            ? "border-paper/50 bg-paper/10"
            : "border-paper/25 bg-paper/5 hover:border-paper/40 hover:bg-paper/10"
        } ${isOpening ? "pointer-events-none opacity-70" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          (fileInputRef.current as unknown as { click?: () => void } | null)?.click?.();
        }}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            (fileInputRef.current as unknown as { click?: () => void } | null)?.click?.();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="pointer-events-none flex h-12 w-12 items-center justify-center rounded-full border border-beige/20 bg-night-card">
          <Upload
            aria-hidden
            className="h-5 w-5 text-signal"
            strokeWidth={2}
          />
        </div>
        <p className="pointer-events-none mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-beige">
          {isOpening ? "Opening editor..." : "Drop here"}
        </p>
        <p className="landing-soft pointer-events-none mt-2 text-[10px] leading-5">
          Photo, PDF, or video
        </p>
      </div>
      <input
        accept={acceptedMediaInputTypes}
        className="hidden"
        multiple
        onChange={(event) => {
          const input = event.target as unknown as {
            files: FileList | null;
            value: string;
          };
          const files = input.files;

          if (files?.length) {
            void openInEditor(Array.from(files));
          }

          input.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      {errorMessage ? (
        <p className="landing-muted absolute inset-x-5 bottom-3 text-center text-[10px] leading-4">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function WatermarkVisual() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(160deg,#1a1f24,#36454f)]">
      <div className="absolute inset-0 grid rotate-[-24deg] grid-cols-2 content-center gap-4 px-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-beige/15">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index}>Mark</span>
        ))}
      </div>
      <div className="absolute inset-8 rounded-xl border border-beige/15 bg-night/40" />
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="relative aspect-[4/5] bg-[linear-gradient(160deg,#1a1f24,#36454f)]">
      <div className="absolute inset-6 rounded-xl border border-beige/15 bg-night-card" />
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-signal px-4 py-2 text-xs font-semibold text-white">
        <Download aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
        Export
      </div>
    </div>
  );
}
