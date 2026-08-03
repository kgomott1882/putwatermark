"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  VIDEO_EDITING_TOOLS_OPENING_DEFINITION,
  videoEditingToolsFaqSchema,
} from "@/lib/blog/posts";

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

type BlogVideoEditingToolsArticleProps = {
  post: BlogPost;
};

export function BlogVideoEditingToolsArticle({
  post,
}: BlogVideoEditingToolsArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {VIDEO_EDITING_TOOLS_OPENING_DEFINITION}
          </p>

          <ArticleSection title="Trim Your Video">
            <p>
              Cut down a clip without opening a separate app. Drag the trim handles to set
              your start and end points, preview the trimmed range, and export just the
              section you need. Useful for pulling a highlight out of a longer recording,
              or cutting dead air off the front and back of a clip before you watermark and
              share it.
            </p>
          </ArticleSection>

          <ArticleSection title="Blur Sensitive Footage">
            <p>
              Sometimes a video has something in it you don&apos;t want visible, like a license
              plate, a face, a document on a desk in the background. The blur tool lets
              you paint a mosaic style blur over a specific area of the frame, and set
              exactly which part of the timeline it applies to. The blur only shows during
              the time range you choose, so the rest of your video stays untouched.
            </p>
          </ArticleSection>

          <ArticleSection title="Merge Multiple Clips Into One">
            <p>
              Recorded several short clips that really belong together as one video? Upload
              them, arrange them in order, and merge them into a single file. This is
              useful for combining multiple takes, joining screen recording segments, or
              assembling a sequence of clips into one continuous video, all before you add
              a watermark or export.
            </p>
          </ArticleSection>

          <ArticleSection title="Add Captions">
            <p>
              Drop captions directly onto your video without needing a separate captioning
              tool. This helps with accessibility, and it also matters for platforms where a
              large share of viewers watch with the sound off.
            </p>
          </ArticleSection>

          <ArticleSection title="Control Exactly When Your Watermark Appears">
            <p>
              This is one of the more unusual features: instead of a watermark being visible
              for the entire video, you can scope it to a specific time range using a visual
              timeline with filmstrip thumbnails. Want your watermark to appear only during
              the first 15 seconds as a branding intro, or only during a specific clip in a
              longer video? Drag the range handles on the timeline to set exactly when it
              shows and when it doesn&apos;t.
            </p>
          </ArticleSection>

          <ArticleSection title="How Long a Video Can You Edit?">
            <p>
              Short clips (under a minute, 1080p or lower) process instantly right in your
              browser. Longer videos, up to 60 minutes, are handled through server side
              processing, splitting the video into segments, editing each one, and stitching
              them back together automatically. You don&apos;t need to manage any of that
              yourself; you just upload and export like normal, and the length is handled
              behind the scenes. For a deeper walkthrough of the watermarking flow itself,
              see our{" "}
              <BlogInlineLink href={WATERMARK_VIDEO_BLOG_HREF}>
                guide to watermarking video online
              </BlogInlineLink>
              .
            </p>
          </ArticleSection>

          <ArticleSection title="No Separate Apps Needed">
            <p>
              Trim, blur, merge, captions, and watermarking used to mean juggling three or
              four different tools. PutWatermark handles all of it in one browser based
              editor. Upload once, apply whatever combination of edits you need, and export
              a single finished file.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {videoEditingToolsFaqSchema.map((item) => (
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
            Ready to edit a video?{" "}
            <BlogInlineLink href="/watermark">Open the video editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
