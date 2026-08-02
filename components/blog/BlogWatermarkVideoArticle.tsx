"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  WATERMARK_VIDEO_OPENING_DEFINITION,
  watermarkVideoFaqSchema,
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

function getFaqAnswer(question: string, answer: string) {
  if (question === "Is there a size or length limit on watermarking video?") {
    return (
      <>
        Short clips process instantly in your browser. Longer videos (up to 60
        minutes) upload with resumable transfers and are processed automatically on
        our servers. See{" "}
        <BlogInlineLink href="/pricing">current details</BlogInlineLink> for
        credit usage on longer exports.
      </>
    );
  }

  return answer;
}

type BlogWatermarkVideoArticleProps = {
  post: BlogPost;
};

export function BlogWatermarkVideoArticle({ post }: BlogWatermarkVideoArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {WATERMARK_VIDEO_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This guide covers exactly how to watermark a video, what happens behind the
            scenes for longer files, and what to expect from the process either way.
          </p>

          <ArticleSection title="Why Watermarking Video Is Different From Photos">
            <p>
              A photo is a single frame. A video is potentially thousands of frames, and
              &ldquo;watermarking&rdquo; it means applying that same overlay consistently
              across every one of them, then re-encoding the whole file — which takes real
              processing power. This is exactly where a lot of free online tools fall short:
              they can handle a few seconds of footage in a browser, then hit a wall on
              anything longer, either rejecting the file outright or taking so long the tab
              crashes.
            </p>
          </ArticleSection>

          <ArticleSection title="How to Watermark a Video, Step by Step">
            <StepList
              items={[
                {
                  title: "Upload your video.",
                  body: "MP4, MOV, and WebM formats are supported. The file loads in your browser to start; longer or larger clips may be sent to our servers only when you export.",
                },
                {
                  title: "Design your watermark exactly as you would for a photo.",
                  body: "Type text or upload a logo, position it with the same grid or free-drag controls, adjust opacity and size, and tile it in a repeating pattern if you want stronger protection than a single mark provides. You can also add a signature instead, if you're marking the video as reviewed or approved rather than protecting it from copying.",
                },
                {
                  title: "Preview it live",
                  body: "Play the video with the watermark overlaid so you can confirm placement and readability before committing to an export.",
                },
                {
                  title: "Export.",
                  body: "What happens next depends on the video's length and resolution — and it's handled automatically, without you needing to choose anything.",
                },
              ]}
            />
          </ArticleSection>

          <ArticleSection title="What Happens Behind the Scenes When You Export">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">
                    Short clips (under 60 seconds, up to 1080p)
                  </strong>{" "}
                  are processed entirely in your browser. This is instant, free, and never
                  touches a server at all.
                </>,
                <>
                  <strong className="text-beige">Longer videos</strong> (up to 60
                  minutes) are automatically routed to server-side processing instead.
                  Uploads use resumable transfers, so an interrupted connection can be
                  resumed when you export again. You&apos;ll see a slightly different
                  progress indicator while the file uploads and processes on our
                  infrastructure rather than your device, but the result is the same
                  watermarked file, downloaded once it&apos;s ready.
                </>,
                <>
                  <strong className="text-beige">
                    Server-processed videos are deleted after processing.
                  </strong>{" "}
                  They are stored only temporarily — typically within minutes, and no
                  later than 24 hours — then permanently removed. Nothing is retained
                  long-term.
                </>,
              ]}
            />
            <p>
              PutWatermark routes each export automatically — short in-browser clips and
              longer server-side jobs — so you do not need to choose a processing path
              yourself. Most larger videos are processed on our servers when possible;
              very large files may need to be split for now.
            </p>
          </ArticleSection>

          <ArticleSection title="Tips for Video-Specific Watermark Placement">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">A single corner mark</strong> works well
                  for finished, delivered footage — it&apos;s unobtrusive and reads as
                  clean branding, similar to how a single watermark works on a photo.
                </>,
                <>
                  <strong className="text-beige">A tiled, repeating pattern</strong> is
                  worth using for footage shared before a transaction is final, or anything
                  at real risk of being clipped and reposted elsewhere — screen recording
                  defeats most protection methods, but a tiled watermark at least ensures
                  your mark travels with the footage regardless of how it&apos;s cropped or
                  re-shared. See{" "}
                  <BlogInlineLink href="/blog/single-vs-tiled-watermarks">
                    single vs. tiled watermarks
                  </BlogInlineLink>{" "}
                  for a fuller breakdown of when each makes sense.
                </>,
                <>
                  <strong className="text-beige">Keep opacity moderate for delivered work.</strong>{" "}
                  Video is watched, not just glanced at — a heavy, distracting watermark is
                  more noticeable over the length of a clip than it would be on a still
                  photo.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {watermarkVideoFaqSchema.map((item) => (
                <div className="px-6 py-5 md:px-8" key={item.question}>
                  <h3 className="text-base font-semibold text-beige md:text-lg">
                    {item.question}
                  </h3>
                  <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                    {getFaqAnswer(item.question, item.answer)}
                  </p>
                </div>
              ))}
            </div>
          </ArticleSection>

          <p className="mt-16 text-base leading-8 text-beige md:text-lg">
            Ready to watermark a video?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
