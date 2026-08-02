"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  MERGE_COMPRESS_PDF_OPENING_DEFINITION,
  mergeCompressPdfFaqSchema,
} from "@/lib/blog/posts";

const SIGN_PDF_BLOG_HREF = "/blog/how-to-sign-a-pdf-online-free";

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

type BlogMergeCompressPdfArticleProps = {
  post: BlogPost;
};

export function BlogMergeCompressPdfArticle({ post }: BlogMergeCompressPdfArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {MERGE_COMPRESS_PDF_OPENING_DEFINITION}
          </p>

          <ArticleSection title="Why You'd Need to Merge PDFs">
            <p>Merging comes up more often than people expect. A few common cases:</p>
            <BulletList
              items={[
                "You've scanned a multi-page contract one page at a time, and now you have five separate PDFs that need to become one.",
                "You're assembling a report, portfolio, or application packet from several source documents — a cover letter, a resume, and a few supporting files — and want to send it as a single attachment instead of five.",
                "You've collected signed pages from multiple people and need to combine them into one final signed document.",
              ]}
            />
            <p>
              Rather than emailing a folder of loose files and hoping the recipient opens
              them in the right order, merging gives you one clean document.
            </p>
          </ArticleSection>

          <ArticleSection title="Why You'd Need to Compress a PDF">
            <p>
              Compression solves a different problem: file size. This usually happens when
              a PDF contains scanned pages or embedded photos — each scanned page can be
              several megabytes on its own, and a 20-page scanned document can easily
              balloon past what most email providers allow as an attachment (commonly
              capped around 25MB). Upload forms for job applications, government portals,
              or client intake systems often have even tighter limits.
            </p>
            <p>
              Compressing reduces the file size while keeping the document fully readable
              — you&apos;re not deleting pages or content, just reducing how much space the
              file takes up.
            </p>
          </ArticleSection>

          <ArticleSection title="How to Merge PDFs in Your Browser">
            <StepList
              items={[
                {
                  title: "Open the PDF tools and upload the files you want to combine.",
                  body: "You can drag and drop several PDFs at once.",
                },
                {
                  title: "Arrange them into the order you want the final document to read in.",
                  body: "Drag to reorder if needed.",
                },
                {
                  title: "Click Merge.",
                  body: "Your files are combined into a single PDF.",
                },
                {
                  title: "Preview the result.",
                  body: "Confirm everything's in the right order and nothing's missing.",
                },
                {
                  title: "Export your merged file.",
                  body: "Download the combined document when you're ready.",
                },
              ]}
            />
            <p className="landing-muted mt-6 text-sm leading-7 md:text-base">
              Everything happens in your browser — there&apos;s nothing to install, and you
              can upload, arrange, and preview for free. An account is only needed at the
              export step.
            </p>
          </ArticleSection>

          <ArticleSection title="How to Compress a PDF in Your Browser">
            <StepList
              items={[
                {
                  title: "Upload the PDF you want to shrink.",
                  body: "Open the PDF tools and load your document.",
                },
                {
                  title: "Choose Compress from the PDF tools.",
                  body: "Run compression on the loaded file.",
                },
                {
                  title: "Preview the size reduction before committing to it.",
                  body: "Confirm the document still looks right.",
                },
                {
                  title: "Export your smaller file.",
                  body: "Download the compressed PDF when you're ready.",
                },
              ]}
            />
            <p className="landing-muted mt-6 text-sm leading-7 md:text-base">
              The result is the same content in a smaller package — ready to email,
              upload, or attach without hitting a size wall.
            </p>
          </ArticleSection>

          <ArticleSection title="Can You Merge and Compress the Same File?">
            <p>
              Yes, and it&apos;s a common combination. If you&apos;re merging several scanned
              pages into one document and the combined file ends up too large to email,
              run it through Compress afterward. Merge first, then compress the result —
              that way you get one clean file that&apos;s also small enough to send anywhere.
            </p>
          </ArticleSection>

          <ArticleSection title="Is This Actually Free?">
            <p>
              Uploading, arranging, and previewing both tools is free with no account
              required. You&apos;ll need a free account only at the point of exporting your
              final file — the same model used across every tool on PutWatermark, whether
              you&apos;re watermarking a photo or{" "}
              <BlogInlineLink href={SIGN_PDF_BLOG_HREF}>signing a PDF</BlogInlineLink>.
            </p>
          </ArticleSection>

          <ArticleSection title="No Software, No Subscriptions">
            <p>
              Both tools run entirely in your browser using the same underlying document
              engine as the rest of PutWatermark&apos;s PDF tools (Sign & Fill,
              watermarking). There&apos;s nothing to download, nothing to install, and no
              recurring subscription — just upload, merge or compress, and export.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {mergeCompressPdfFaqSchema.map((item) => (
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
            Ready to merge or compress a PDF?{" "}
            <BlogInlineLink href="/watermark">Open the PDF tools</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
