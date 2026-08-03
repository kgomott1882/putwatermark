"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  AI_WATERMARK_PROTECTION_OPENING_DEFINITION,
  aiWatermarkProtectionFaqSchema,
} from "@/lib/blog/posts";

const SINGLE_VS_TILED_BLOG_HREF = "/blog/single-vs-tiled-watermarks";
const WATERMARK_PHOTOS_BLOG_HREF =
  "/blog/how-to-watermark-photos-pdfs-videos-online-free";
const BATCH_WATERMARK_BLOG_HREF = "/blog/how-to-batch-watermark-multiple-photos";

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

type BlogAiWatermarkProtectionArticleProps = {
  post: BlogPost;
};

export function BlogAiWatermarkProtectionArticle({
  post,
}: BlogAiWatermarkProtectionArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {AI_WATERMARK_PROTECTION_OPENING_DEFINITION}
          </p>

          <ArticleSection title="Why single watermarks are easy to remove">
            <p>
              Most watermarking tools place one mark somewhere on the image, usually
              centered or in a corner. That approach made sense for years, because a
              person manually editing the photo would have to work around it by hand.
            </p>
            <p>
              AI inpainting tools don&apos;t work the way a person editing by hand does.
              Given a marked area and a lot of clean, unmarked surrounding pixels, an
              inpainting model can predict what should be there and reconstruct it. The
              more clean, unmarked area surrounding the mark, the more source material
              the model has to work with. A single centered watermark, no matter how
              large, leaves the rest of the image completely clean. That&apos;s exactly
              the situation these tools are built to handle well.
            </p>
            <p>
              If you want a deeper comparison of single versus tiled placement, see{" "}
              <BlogInlineLink href={SINGLE_VS_TILED_BLOG_HREF}>
                Single vs. Tiled Watermarks
              </BlogInlineLink>
              .
            </p>
          </ArticleSection>

          <ArticleSection title="Why tiled patterns are harder to remove">
            <p>
              This is why professional stock photo sites, Getty Images, iStock, and
              similar platforms, don&apos;t use a single watermark on their preview
              images. They use dense, repeating, diagonal patterns across the entire
              frame.
            </p>
            <p>
              The difference matters because a tiled pattern removes the large clean
              regions an inpainting model relies on. Every area of the image has nearby
              watermark texture. The model doesn&apos;t get a big clean reference zone
              to reconstruct from; it has to guess through a pattern repeated across the
              whole photo. It&apos;s not that this makes removal literally impossible.
              It raises the difficulty and time cost significantly, which is the
              realistic goal. No visible watermark is completely unremovable given
              enough effort; the practical aim is making removal not worth the effort
              for casual theft.
            </p>
          </ArticleSection>

          <div className="mt-14 overflow-hidden rounded-[1.75rem] landing-border border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Photo preview protected with a tiled watermark pattern against AI removal"
              className="aspect-[16/9] w-full object-cover"
              decoding="async"
              src="/AI PROTECTION.png"
            />
          </div>

          <ArticleSection title="What we changed">
            <p>
              We build a browser based watermarking tool, and we heard this exact
              problem directly from photographers, including a thread from an action
              sports photographer whose event photo sales were being undercut by AI
              watermark removal, since customers could grab a preview off the site and
              clean it up rather than purchasing the real file.
            </p>
            <p>So we rebuilt how our free/default watermark works. Instead of a single center mark, exports now combine:</p>
            <BulletList
              items={[
                <>
                  A full frame, tiled background pattern of your site name or branding
                  at a moderate opacity, covering the entire image, not just one spot
                </>,
                <>
                  A clear, centered brand mark on top, so the primary identifying
                  watermark stays visible and legible
                </>,
              ]}
            />
            <p>
              This mirrors the approach stock photography platforms already use, and it
              applies automatically. There&apos;s no separate setting to find; it&apos;s
              built into how exports work.
            </p>
          </ArticleSection>

          <ArticleSection title="What this doesn't claim">
            <p>
              We&apos;re not going to tell you this makes a photo &ldquo;AI proof.&rdquo;
              No visible watermark is unremovable with enough determination and the
              right tools. What a well designed tiled pattern does is remove the easy
              path: the large clean area that makes automated removal fast and low
              effort. That&apos;s a meaningful, practical improvement, and it&apos;s
              the same reasoning the stock photo industry has relied on for years.
            </p>
          </ArticleSection>

          <ArticleSection title="If you're protecting proofs or previews">
            <p>
              A few additional things worth doing alongside a stronger watermark
              pattern:
            </p>
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Keep your preview resolution modest.</strong>{" "}
                  A watermark free but low resolution image isn&apos;t worth much to
                  someone trying to avoid paying. This is a separate, simpler layer of
                  protection that doesn&apos;t depend on the watermark holding up at
                  all.
                </>,
                <>
                  <strong className="text-beige">
                    Use a tiled pattern, not a single mark
                  </strong>
                  , for anything you&apos;re worried about being lifted before purchase.
                </>,
                <>
                  <strong className="text-beige">
                    Keep your full resolution, unwatermarked files delivered only after
                    purchase
                  </strong>
                  . Never make the clean version available anywhere a customer could
                  grab it directly.
                </>,
              ]}
            />
            <p>
              For a step by step walkthrough of watermarking photos in the browser, see{" "}
              <BlogInlineLink href={WATERMARK_PHOTOS_BLOG_HREF}>
                How to Watermark Photos, PDFs, and Videos Online
              </BlogInlineLink>
              . If you&apos;re sending a full proof set,{" "}
              <BlogInlineLink href={BATCH_WATERMARK_BLOG_HREF}>
                batch watermarking multiple photos
              </BlogInlineLink>{" "}
              applies the same protection across every image in one pass.
            </p>
          </ArticleSection>

          <ArticleSection title="Try it">
            <p>
              If you&apos;re watermarking photos to protect proofs before a sale, this
              tiled protection is already built into your exports. No extra setup, no
              separate toggle to find.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {aiWatermarkProtectionFaqSchema.map((item) => (
                <div className="px-6 py-5 md:px-8" key={item.question}>
                  <h3 className="text-base font-semibold text-beige md:text-lg">
                    {item.question}
                  </h3>
                  <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </ArticleSection>

          <p className="mt-16 text-base leading-8 text-beige md:text-lg">
            Ready to watermark your next proof set?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
