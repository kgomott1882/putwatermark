"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  SINGLE_VS_TILED_OPENING_DEFINITION,
  singleVsTiledFaqSchema,
} from "@/lib/blog/posts";

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

type BlogSingleVsTiledWatermarkArticleProps = {
  post: BlogPost;
};

export function BlogSingleVsTiledWatermarkArticle({
  post,
}: BlogSingleVsTiledWatermarkArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {SINGLE_VS_TILED_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            Which one is right depends less on preference and more on what you&apos;re
            actually trying to prevent.
          </p>

          <ArticleSection title="What Each One Is Actually Good At">
            <p>
              A single watermark reads as a signature, not an obstruction. Placed in a
              corner at moderate opacity, it identifies the image&apos;s owner without
              getting in the way of the photo itself — this is the standard choice for
              finished, delivered work: a portfolio piece, a marketing photo, a product
              listing image.
            </p>
            <p>
              A tiled watermark trades visual cleanliness for something harder to defeat.
              Because the mark repeats across the whole image at an angle, there&apos;s no
              single corner to crop out and no clean section of the photo left untouched.
              It&apos;s a deliberately more intrusive choice, used specifically when the
              goal is making an image unusable if copied, not just identifying who it
              belongs to.
            </p>
          </ArticleSection>

          <ArticleSection title="The Core Tradeoff: A Single Watermark Can Be Cropped Out">
            <p>
              This is the part that matters most, and it&apos;s a real weakness worth being
              honest about: a single watermark, however carefully placed, occupies one
              region of the photo. Anyone willing to crop the image — trivial with any
              basic photo editor — can often remove it entirely, especially if it sits in a
              corner rather than overlapping the main subject.
            </p>
            <p>
              A tiled watermark doesn&apos;t have this problem. Cropping around a repeating
              pattern that covers the whole frame either removes most of the photo along
              with it, or leaves visible remnants of the watermark behind. This is why stock
              photo platforms and other sites that need to show a preview without giving
              away a usable copy almost universally use a tiled or heavily overlapping
              mark, not a single corner stamp.
            </p>
          </ArticleSection>

          <div className="mt-14 overflow-hidden rounded-[1.75rem] landing-border border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Portrait photo illustrating a single watermark placement"
              className="aspect-[16/9] w-full object-cover"
              decoding="async"
              src="/Young_white_male_black.jpg"
            />
          </div>

          <ArticleSection title="When a Single Watermark Is the Right Choice">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Finished, delivered work</strong> — a
                  final photo you&apos;re sharing publicly or handing over as the end
                  product, where looking professional matters more than maximizing theft
                  resistance.
                </>,
                <>
                  <strong className="text-beige">Branding-forward use cases</strong> —
                  product photography, portfolio pieces, marketing materials, where the
                  watermark is meant to build recognition, not lock the image down.
                </>,
                <>
                  <strong className="text-beige">
                    Situations where the recipient is already trusted
                  </strong>{" "}
                  — a client who&apos;s paid for the work, or an internal use case where
                  unauthorized redistribution isn&apos;t a serious concern.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="When a Tiled Watermark Is the Right Choice">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">
                    Proofs and previews shared before payment or final agreement
                  </strong>{" "}
                  — client photo proofs, draft work, or anything shared before a
                  transaction is complete, where the risk of someone taking the
                  &ldquo;free&rdquo; version and never paying is real.
                </>,
                <>
                  <strong className="text-beige">
                    High-value or high-theft-risk content
                  </strong>{" "}
                  — images that are especially likely to be screenshotted, reposted, or
                  reused without credit.
                </>,
                <>
                  <strong className="text-beige">
                    Anywhere you&apos;re prioritizing protection over how the image looks
                  </strong>{" "}
                  — the whole point of a tiled mark is that it&apos;s supposed to be
                  somewhat intrusive; if it isn&apos;t noticeable enough to discourage
                  reuse, it isn&apos;t doing its job.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="A Common Middle Ground: Two Versions of the Same Image">
            <p>
              A pattern many photographers and creators use: a tiled, heavily-marked
              version for previews, proofs, or anything shared before payment, and a clean,
              single-watermark (or unwatermarked) version delivered only once the work is
              actually paid for or finalized. This gets the benefit of both — a genuinely
              protected preview, and a polished final product that doesn&apos;t carry a
              distracting mark.
            </p>
          </ArticleSection>

          <ArticleSection title="Adjusting a Tiled Watermark Without Overdoing It">
            <p>
              A tiled watermark doesn&apos;t have to mean plastering &ldquo;SAMPLE&rdquo;
              across an image in giant letters. A few adjustable factors change how
              aggressive it feels:
            </p>
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Density</strong> — how many repetitions
                  appear across the image. Sparse spacing is less visually loud while still
                  covering enough of the frame to resist cropping; dense spacing maximizes
                  protection at the cost of a busier look.
                </>,
                <>
                  <strong className="text-beige">Angle</strong> — a diagonal pattern
                  (commonly 45°) tends to interact less predictably with a photo&apos;s
                  natural lines than a straight horizontal or vertical repeat, making it
                  marginally harder to visually &ldquo;tune out&rdquo; or edit around.
                </>,
                <>
                  <strong className="text-beige">Opacity</strong> — lower opacity keeps
                  the underlying photo more visible for someone genuinely evaluating it,
                  while still leaving enough of a mark that a screenshot or crop carries
                  the pattern along with it.
                </>,
              ]}
            />
            <p>
              The right combination depends on how much the image itself needs to stay
              legible versus how much protection matters more than presentation.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {singleVsTiledFaqSchema.map((item) => (
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
            Ready to try both approaches?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
