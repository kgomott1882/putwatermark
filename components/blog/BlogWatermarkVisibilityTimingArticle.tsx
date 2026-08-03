"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  WATERMARK_VISIBILITY_TIMING_OPENING_DEFINITION,
  watermarkVisibilityTimingFaqSchema,
} from "@/lib/blog/posts";

const VIDEO_EDITING_BLOG_HREF =
  "/blog/video-editing-tools-trim-blur-merge-captions";
const WATERMARK_VIDEO_BLOG_HREF = "/blog/how-to-watermark-a-video-online-free";

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

type BlogWatermarkVisibilityTimingArticleProps = {
  post: BlogPost;
};

export function BlogWatermarkVisibilityTimingArticle({
  post,
}: BlogWatermarkVisibilityTimingArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {WATERMARK_VISIBILITY_TIMING_OPENING_DEFINITION}
          </p>

          <ArticleSection title="Why Would You Want a Watermark to Come and Go?">
            <p>A few real situations where this matters:</p>
            <BulletList
              items={[
                <>
                  <strong className="text-beige">
                    Branding an intro without covering the whole video.
                  </strong>{" "}
                  Show your logo or name during the first 10 to 15 seconds as a branded
                  opener, then let the rest of the video play clean.
                </>,
                <>
                  <strong className="text-beige">
                    Marking a specific highlight or clip.
                  </strong>{" "}
                  If you&apos;ve merged several clips together, you might want your
                  watermark visible only on the clip you&apos;re promoting or protecting,
                  not the whole compilation.
                </>,
                <>
                  <strong className="text-beige">Drawing attention to a moment.</strong>{" "}
                  A watermark that appears briefly around a key timestamp can act like a
                  visual callout, rather than a constant background element competing for
                  attention the whole time.
                </>,
                <>
                  <strong className="text-beige">
                    Reducing visual clutter on long videos.
                  </strong>{" "}
                  A watermark visible for an entire 20-minute video can feel heavier than
                  one that appears for a focused window and then steps back.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="How It Works">
            <p>
              Instead of a single on/off toggle, the watermark timing tool gives you a
              visual timeline underneath your video, with filmstrip thumbnails showing
              the actual content at each point, so you can see exactly what&apos;s
              happening in the video while you set your range.
            </p>
            <p className="font-semibold text-beige">
              To scope a watermark to a specific time range:
            </p>
            <StepList
              items={[
                {
                  title: "Add your text watermark as you normally would.",
                  body: "Choose your font, position, and style.",
                },
                {
                  title: "Open the timing controls.",
                  body: "You'll see a timeline with thumbnail previews of your video.",
                },
                {
                  title: "Drag the range handles.",
                  body: "Set the start and end point where you want the watermark visible.",
                },
                {
                  title: "Use the draggable playhead to scrub through your video.",
                  body: "Preview exactly when the watermark appears and disappears.",
                },
                {
                  title: "Adjust the range as many times as you need.",
                  body: "Nothing is locked in until you export.",
                },
              ]}
            />
            <p>
              The watermark will only render during the range you&apos;ve set. Outside of
              that window, your video plays exactly as uploaded.
            </p>
          </ArticleSection>

          <ArticleSection title="Can I Set Multiple Time Ranges?">
            <p>
              Right now, timing controls apply to a single continuous range per watermark
              layer. If you need the watermark to appear at two separate points in the
              video (for example, during the intro and again near the end), you can add
              the watermark as a separate layer for each range you want.
            </p>
          </ArticleSection>

          <ArticleSection title="Does This Work on Longer Videos?">
            <p>
              Watermark timing is currently supported for videos processed directly in
              your browser (client side, generally under a minute at 1080p or lower).
              Longer, server processed videos don&apos;t support timed watermarks yet.
              For broader video editing options like trim, blur, merge, and captions, see
              our{" "}
              <BlogInlineLink href={VIDEO_EDITING_BLOG_HREF}>
                video editing overview
              </BlogInlineLink>
              , or the{" "}
              <BlogInlineLink href={WATERMARK_VIDEO_BLOG_HREF}>
                watermarking video guide
              </BlogInlineLink>{" "}
              for export basics.
            </p>
          </ArticleSection>

          <ArticleSection title="Why Most Watermarking Tools Don't Offer This">
            <p>
              Static, always on watermarks are simpler to build, which is why most tools
              stop there. A timeline based visibility control means tracking exactly when
              a watermark should render frame by frame, rather than just overlaying it
              uniformly across the whole export. It&apos;s a small feature to describe,
              but it&apos;s the kind of detail that usually only shows up in dedicated
              video editing software, not in a typical browser based watermarking tool.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {watermarkVisibilityTimingFaqSchema.map((item) => (
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
            If you&apos;re watermarking a video and want more control than &ldquo;on the
            whole time&rdquo; or &ldquo;not at all,&rdquo; this is built into the same
            editor you&apos;re already using. No separate tool, no extra steps beyond
            dragging a couple of handles on a timeline.{" "}
            <BlogInlineLink href="/watermark">Try it in the video editor</BlogInlineLink>
            .
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
