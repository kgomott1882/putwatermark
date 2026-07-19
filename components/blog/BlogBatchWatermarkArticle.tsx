"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  BATCH_WATERMARK_OPENING_DEFINITION,
  batchWatermarkFaqSchema,
} from "@/lib/blog/posts";

const WATERMARK_BLOG_HREF =
  "/blog/how-to-watermark-photos-pdfs-videos-online-free";
const TINEYE_URL = "https://tineye.com";

function BlogInlineLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
      href={href}
    >
      {children}
    </Link>
  );
}

function BlogExternalLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function ArticleSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold tracking-[-0.04em] text-beige md:text-3xl">
        {title}
      </h2>
      <div className="mt-6 space-y-5 text-base leading-8 text-beige md:text-[1.05rem]">
        {children}
      </div>
    </section>
  );
}

function StepList({
  items,
}: {
  items: readonly { title: string; body: ReactNode }[];
}) {
  return (
    <ol className="mt-6 space-y-5">
      {items.map((item, index) => (
        <li className="flex gap-4" key={item.title}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sand/40 bg-night-elevated text-sm font-semibold text-sand">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold text-beige">{item.title}</p>
            <p className="landing-muted mt-1 text-sm leading-7 md:text-base">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item, index) => (
        <li className="flex gap-3" key={index}>
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" />
          <span className="landing-muted text-sm leading-7 md:text-base">{item}</span>
        </li>
      ))}
    </ul>
  );
}

type BlogBatchWatermarkArticleProps = {
  post: BlogPost;
};

export function BlogBatchWatermarkArticle({ post }: BlogBatchWatermarkArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {BATCH_WATERMARK_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This guide covers when batch watermarking actually saves time, how to do it,
            and what it doesn&apos;t do — since a batch export isn&apos;t the same as
            individually customizing every photo.
          </p>

          <ArticleSection title="Why Batch Watermarking Matters">
            <p>
              Watermarking one photo at a time is fine for a single image. It stops making
              sense the moment you have a real volume of work to protect:
            </p>
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Photographers delivering a shoot</strong>{" "}
                  — a wedding, event, or portrait session can easily produce 50–300+ final
                  images. Watermarking each one individually before sending proofs to a
                  client would take longer than the shoot itself.
                </>,
                <>
                  <strong className="text-beige">E-commerce sellers</strong> listing dozens
                  of product photos need consistent branding across every image, without
                  manually repeating the same steps for each one.
                </>,
                <>
                  <strong className="text-beige">Real estate agents and property managers</strong>{" "}
                  photographing a listing often have 20–40 photos per property that all need
                  the same agency watermark before going on a listing site.
                </>,
                <>
                  <strong className="text-beige">Anyone building a portfolio</strong> — a set
                  of images uploaded to a gallery or personal site benefits from one consistent
                  watermark style across the whole set, not a patchwork of slightly different
                  placements.
                </>,
              ]}
            />
            <p>
              The time saved scales with volume: watermarking 100 photos individually versus
              as a single batch isn&apos;t a small convenience, it&apos;s the difference
              between minutes and hours.
            </p>
          </ArticleSection>

          <ArticleSection title="How to Batch Watermark Photos, Step by Step">
            <StepList
              items={[
                {
                  title: "Upload multiple photos at once.",
                  body: "Select or drag several images into the tool together — the interface switches into batch mode automatically once more than one photo is present.",
                },
                {
                  title: "Review the batch.",
                  body: "A thumbnail strip shows every uploaded photo. Click through them to preview how your watermark will look on each one before committing to settings.",
                },
                {
                  title: "Set up your watermark once.",
                  body: "Choose text or a logo, position it, adjust opacity and size, and set up tiling if you want stronger protection — exactly as you would for a single photo. Whatever you configure applies to every image in the batch.",
                },
                {
                  title: "Check a few different photos in the set.",
                  body: "Especially if they vary in orientation or aspect ratio (a mix of portrait and landscape shots, for example), confirm the watermark placement still looks right across all of them.",
                },
                {
                  title: "Export the batch.",
                  body: "All photos process and download together as a single ZIP file, each one individually watermarked and named based on its original filename.",
                },
              ]}
            />
          </ArticleSection>

          <ArticleSection title="What Batch Watermarking Doesn't Do">
            <p>
              Worth being upfront about the scope, so expectations are accurate:
            </p>
            <BulletList
              items={[
                "All photos in a batch share the same watermark settings. You can't set a different position, opacity, or text for individual photos within the same batch — it's one configuration applied consistently across the whole set. If you need meaningfully different watermarks on different photos, that requires separate batches or separate exports.",
                "Batch watermarking currently covers photos, not video or PDF. Videos and PDFs are watermarked individually — each on its own, not as part of a multi-file batch.",
                "It's not a per-image editing tool. Cropping, resizing, or rotating a specific photo differently from the rest of its batch isn't part of the batch flow — those edits are made one photo at a time, before or outside of batch export.",
              ]}
            />
          </ArticleSection>

          <ArticleSection title="Why Consistent Placement Matters Across Different Photos">
            <p>
              A common issue with cheaper or simpler watermarking tools: a watermark
              positioned by fixed pixel coordinates looks right on the photo it was designed
              against, then looks wrong — too close to an edge, oddly placed, or cropped off
              entirely — on a different photo with a different aspect ratio.
            </p>
            <p>
              Positioning based on relative percentage placement (rather than a fixed pixel
              location) avoids this. A watermark set to &ldquo;bottom-right&rdquo; stays
              sensibly in the bottom-right corner whether the photo is a wide landscape shot
              or a tall portrait crop, because the position scales with the image rather than
              being locked to an absolute coordinate. This is worth checking for in any batch
              tool — inconsistent placement across a set of otherwise-uniform photos looks
              unpolished, and defeats some of the point of batching them together in the first
              place.
            </p>
            <p>
              For a broader overview of watermarking options beyond batch photos, see the{" "}
              <BlogInlineLink href={WATERMARK_BLOG_HREF}>
                guide to watermarking photos, PDFs, and videos online
              </BlogInlineLink>
              .
            </p>
          </ArticleSection>

          <ArticleSection title="After Watermarking: Checking for Existing Unauthorized Use">
            <p>
              If you&apos;re watermarking a portfolio or body of work you&apos;re protecting
              going forward, it&apos;s worth also checking whether older, unwatermarked photos
              are already circulating without permission. Reverse image search tools like{" "}
              <BlogExternalLink href={TINEYE_URL}>TinEye</BlogExternalLink> are built
              specifically to find exact and edited copies of an image across the web —
              including versions with watermarks removed or cropped out — which makes them a
              useful complementary step alongside watermarking new work.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {batchWatermarkFaqSchema.map((item) => (
                <div className="px-6 py-5 md:px-8" key={item.question}>
                  <h3 className="text-base font-semibold text-beige md:text-lg">
                    {item.question}
                  </h3>
                  <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                    {item.question ===
                    "Does batch watermarking cost more than watermarking one photo?" ? (
                      <>
                        No — the cost is calculated per photo the same way whether
                        it&apos;s exported alone or as part of a batch. See{" "}
                        <BlogInlineLink href="/pricing">pricing</BlogInlineLink> for the
                        current credit rates.
                      </>
                    ) : (
                      item.answer
                    )}
                  </p>
                </div>
              ))}
            </div>
          </ArticleSection>

          <p className="mt-16 text-base leading-8 text-beige md:text-lg">
            Ready to watermark a set of photos?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
