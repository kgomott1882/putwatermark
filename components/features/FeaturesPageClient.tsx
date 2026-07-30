"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Crop,
  Eye,
  FileText,
  Files,
  Globe,
  Grid3x3,
  ImageIcon,
  MonitorSmartphone,
  PenLine,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "../Footer";
import {
  BentoDotGrid,
  LandingCta,
  LandingHighlight,
  LandingSectionHeader,
} from "../landing/LandingPrimitives";
import { pageContainerClass } from "../pageContainer";

type FeatureTabId = "watermarking" | "editing" | "file-support" | "compatibility";

type FeatureTab = {
  id: FeatureTabId;
  label: string;
};

type CapabilityCard = {
  title: string;
  description: string;
  bullets?: string[];
  Icon: LucideIcon;
  image?: string;
  imageAlt?: string;
};

const tabs: FeatureTab[] = [
  { id: "watermarking", label: "Watermarking" },
  { id: "editing", label: "Editing" },
  { id: "file-support", label: "File support" },
  { id: "compatibility", label: "Compatibility" },
];

const tabContent: Record<FeatureTabId, CapabilityCard[]> = {
  watermarking: [
    {
      title: "Custom text watermarks",
      description:
        "Choose from System Sans, Geometric Sans, Serif, Monospace, Condensed, and Script. Drag into place or use the preset grid, then adjust opacity and size. Quick templates (Subtle corner, Protect dense/light) and saved presets live in the Watermark panel.",
      Icon: Type,
      image: "/Custom watermaks.png",
      imageAlt: "Custom text watermark on a photo",
    },
    {
      title: "Logo watermarks",
      description:
        "Upload your own logo and position it like text. Best-effort background removal helps plain-background logos — this is logo-only, not full photo background removal.",
      Icon: ImageIcon,
      image: "/Logo watermaks.png",
      imageAlt: "Logo watermark applied to an image",
    },
    {
      title: "Sign & fill",
      description:
        "Draw a signature or type your name in a script font, add initials, and place fill-in text fields on PDF pages. Export uses 50 credits per billable page, with a 5-credit fill surcharge on pages that contain fill text.",
      Icon: PenLine,
      image: "/Signatures.png",
      imageAlt: "Signature and fill-text fields placed on a document",
    },
    {
      title: "Tile watermarking",
      description:
        "Repeat your watermark across the image with adjustable density (sparse, medium, dense), angle (0°, 45°, 90°, 180°), and gap spacing.",
      Icon: Grid3x3,
      image: "/Shoes.jpeg",
      imageAlt: "Tiled watermark pattern across a product photo",
    },
    {
      title: "Batch watermarking",
      description:
        "Upload multiple images at once, apply the same watermark settings to every file, and export everything together as a ZIP.",
      Icon: Files,
      image: "/batch.png",
      imageAlt: "Batch watermarking multiple photos at once",
    },
  ],
  editing: [
    {
      title: "Crop, resize, rotate",
      description:
        "Adjust your photo before or after watermarking with built-in crop handles, resize controls, and rotation.",
      Icon: Crop,
      image: "/Crop.png",
      imageAlt: "Photo with crop and resize handles in the editor",
    },
    {
      title: "Photo effects",
      description:
        "Five built-in looks in the Effects panel. Select one to preview it on your photo:",
      bullets: [
        "Border — Add a thin, medium, or thick frame in ink or paper.",
        "Exposure — Brighten or darken the image from -50% to +50%.",
        "Grayscale — Convert the photo to full black and white.",
        "Sepia — Apply a warm sepia tone across the image.",
        "Vintage — Muted, warm-toned color with a soft vignette.",
      ],
      Icon: Sparkles,
      image: "/Photo effects.png",
      imageAlt: "Photo with a sepia-style effect applied",
    },
    {
      title: "Live preview & full history",
      description:
        "Every adjustment updates instantly on screen before you export — crop, resize, rotate, effects, and watermark settings — so you see exactly what you will get. Undo and redo changes from the editor bar, stepping backward or forward through text, logo, position, opacity, tile, and related adjustments without losing your place.",
      Icon: Eye,
      image: "/White_man_working.jpeg",
      imageAlt: "Person reviewing a photo on a laptop in the editor",
    },
  ],
  "file-support": [
    {
      title: "Images",
      description:
        "JPG, PNG, and WebP photos are supported in the editor. Watermark them, then crop, resize, rotate, and apply effects — all before export.",
      Icon: Upload,
      image: "/Grid_collage_humans.jpg",
      imageAlt: "Grid collage of portrait photos",
    },
    {
      title: "Video",
      description:
        "MP4, MOV, and WebM clips under 60 seconds and 1080p process instantly in your browser. Longer or larger videos (up to 250MB or 10 minutes) upload with resumable transfers and are processed on our servers.",
      Icon: Video,
      image: "/youtubers-watermarked.jpg",
      imageAlt: "Video frame with a watermark overlay",
    },
    {
      title: "PDF",
      description:
        "Multi-page documents are supported with the same watermark placement on every page. Original text stays selectable and searchable — only the watermark itself is added as an overlay.",
      Icon: FileText,
      image: "/Pics/feature-pdf-support.jpg",
      imageAlt: "PDF document with watermark support",
    },
  ],
  compatibility: [
    {
      title: "Browser Based",
      description:
        "PutWatermark runs in any modern browser. Open the editor and start working — no download or installation required.",
      Icon: Globe,
      image: "/Browser Based.png",
      imageAlt: "Watermarking tool running in a web browser",
    },
    {
      title: "Works on Any Device",
      description:
        "Use PutWatermark on desktop, tablet, or phone through your browser wherever you need it.",
      Icon: MonitorSmartphone,
      image: "/Laptop,_tablet,_smartphone.jpeg",
      imageAlt: "Laptop, tablet, and smartphone showing the editor",
    },
    {
      title: "Client-Side Processing",
      description:
        "Most operations — images, PDFs, and short videos — run entirely on your device for speed and privacy. Larger videos are processed on our servers when possible; very large files may need to be split for now. Files are deleted immediately afterward.",
      Icon: ShieldCheck,
      image: "/Client-Side Processing.png",
      imageAlt: "Files processed locally on the user's device",
    },
  ],
};

const compatibilityComparison = {
  leftTitle: "Traditional Desktop Software",
  rightTitle: "PutWatermark",
  rows: [
    {
      traditional: "Requires download and installation",
      putwatermark: "No installation or download necessary",
    },
    {
      traditional: "Only works on the device it's installed on",
      putwatermark: "Access from any device with a browser",
    },
    {
      traditional: "Manual updates required",
      putwatermark: "Always up to date automatically",
    },
    {
      traditional: "Learning curve for complex tools",
      putwatermark: "Simple, guided interface",
    },
  ],
} as const;

const featureTabIds = new Set<FeatureTabId>([
  "watermarking",
  "editing",
  "file-support",
  "compatibility",
]);

function isFeatureTabId(value: string | null): value is FeatureTabId {
  return value !== null && featureTabIds.has(value as FeatureTabId);
}

export function FeaturesPageClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeatureTabId>("watermarking");

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (isFeatureTabId(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const activeCards = tabContent[activeTab];

  return (
    <main className="landing-theme">
      <section className="landing-section border-b">
        <div className={pageContainerClass}>
          <LandingSectionHeader
            index="Features"
            lead={
              <>
                Browse by category to see what{" "}
                <LandingHighlight>PutWatermark can do</LandingHighlight>.
              </>
            }
            title="Built-in capabilities"
          />

          <div className="mt-14 landing-border border-b">
            <div
              className="flex gap-2 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    aria-selected={isActive}
                    className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition md:px-5 ${
                      isActive
                        ? "border-signal text-beige"
                        : "border-transparent text-beige-dim hover:text-sand"
                    }`}
                    id={`features-tab-${tab.id}`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              aria-labelledby={`features-tab-${activeTab}`}
              className="mt-12"
              exit={{ opacity: 0, y: 12 }}
              id={`features-panel-${activeTab}`}
              initial={{ opacity: 0, y: 16 }}
              key={activeTab}
              role="tabpanel"
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeCards.map((card, index) => (
                  <CapabilityCard card={card} index={index} key={card.title} />
                ))}
              </div>
              {activeTab === "compatibility" ? (
                <ComparisonTableCard index={activeCards.length} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-16 flex flex-col items-start justify-between gap-6 landing-border border-t pt-12 md:flex-row md:items-center">
            <p className="landing-muted max-w-xl text-sm leading-7 md:text-base">
              Ready to try it? Open the editor, upload a file, and preview freely —{" "}
              <LandingHighlight>create a free account when you export</LandingHighlight>.
            </p>
            <LandingCta href="/watermark">Try it now</LandingCta>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function CapabilityCard({
  card,
  index,
}: {
  card: CapabilityCard;
  index: number;
}) {
  const Icon = card.Icon;

  return (
    <motion.article
      className="landing-surface flex h-full flex-col overflow-hidden rounded-[2rem]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.06 }}
    >
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#1a1f24,#36454f)]">
        {card.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            alt={card.imageAlt ?? card.title}
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            src={card.image}
          />
        ) : (
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.45)_0.6px,transparent_0.6px)] [background-size:20px_20px]" />
        )}
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-2xl landing-border border bg-night-elevated/90 text-sand backdrop-blur-sm ${
            card.image ? "shadow-[0_12px_32px_rgba(0,0,0,0.35)]" : ""
          }`}
        >
          <Icon aria-hidden className="h-7 w-7" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-8 md:p-9">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-beige md:text-2xl">
            {card.title}
          </h3>
          <BentoDotGrid />
        </div>
        <p className="landing-muted mt-4 text-sm leading-7 md:text-[0.95rem]">
          {card.description}
        </p>
        {card.bullets?.length ? (
          <ul className="mt-5 space-y-2.5 landing-border border-t pt-5">
            {card.bullets.map((bullet) => (
              <li
                className="landing-muted text-sm leading-6 md:text-[0.95rem]"
                key={bullet}
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.article>
  );
}

function ComparisonTableCard({ index }: { index: number }) {
  return (
    <motion.article
      className="landing-surface mt-6 overflow-hidden rounded-[2rem]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.06 }}
    >
      <div className="landing-border border-b p-8 md:p-9">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-beige md:text-2xl">
            How PutWatermark compares
          </h3>
          <BentoDotGrid />
        </div>
        <p className="landing-muted mt-4 max-w-2xl text-sm leading-7 md:text-[0.95rem]">
          A quick look at browser-based watermarking versus traditional
          desktop software — no specific product names, just the usual
          trade-offs.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="landing-border border-b bg-night-elevated">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-beige-dim md:px-9">
                {compatibilityComparison.leftTitle}
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-sand md:px-9">
                {compatibilityComparison.rightTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            {compatibilityComparison.rows.map((row) => (
              <tr className="landing-border border-b last:border-b-0" key={row.traditional}>
                <td className="px-6 py-4 align-top md:px-9">
                  <div className="flex items-start gap-3">
                    <X
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-beige-dim"
                      strokeWidth={2.2}
                    />
                    <span className="landing-muted text-sm leading-6 md:text-[0.95rem]">
                      {row.traditional}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 align-top md:px-9">
                  <div className="flex items-start gap-3">
                    <Check
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-signal"
                      strokeWidth={2.4}
                    />
                    <span className="text-sm leading-6 text-beige md:text-[0.95rem]">
                      {row.putwatermark}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.article>
  );
}
