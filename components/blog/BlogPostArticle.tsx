"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import { LandingCta, LandingHighlight } from "../landing/LandingPrimitives";
import type { BlogPost } from "@/lib/blog/posts";
import { blogFaqSchema, OPENING_DEFINITION } from "@/lib/blog/posts";

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

const comparisonRows = [
  {
    label: "Setup",
    traditional: "Requires download and installation",
    putwatermark: "None — works instantly in any browser",
  },
  {
    label: "Device access",
    traditional: "Only works on the device it's installed on",
    putwatermark: "Works from any device with a browser",
  },
  {
    label: "Updates",
    traditional: "Manual updates required",
    putwatermark: "Always up to date automatically",
  },
  {
    label: "Learning curve",
    traditional: "Often complex, feature-heavy interfaces",
    putwatermark: "Simple, guided controls",
  },
  {
    label: "Cost to start",
    traditional: "Often requires upfront purchase",
    putwatermark: (
      <>
        Free to try, pay only for{" "}
        <BlogInlineLink href="/pricing">credits</BlogInlineLink> when needed
      </>
    ),
  },
] as const;

type BlogPostArticleProps = {
  post: BlogPost;
};

export function BlogPostArticle({ post }: BlogPostArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This guide covers exactly how to watermark each file type, why it matters,
            and what to look for in a watermarking tool in 2026.
          </p>

          <ArticleSection title="Why Watermark Your Content">
            <div className="space-y-5">
                  <p>
                    Anyone who shares photos, videos, or documents online eventually runs
                    into the same problem: once a file leaves your hands, you lose control
                    over how it&apos;s used.
                  </p>
                  <BulletList
                    items={[
                      "Photographers and designers lose portfolio images to unauthorized reposting, print sales, and stock photo sites that never credit or pay the original creator.",
                      "Videographers find clips reused in ads, social media, or other people's projects without permission or attribution.",
                      "Freelancers and businesses send draft contracts, proposals, and invoices as PDFs that get forwarded, edited, or presented as someone else's work before a deal is finalized.",
                      "Anyone signing a document needs a way to add their signature without printing, signing by hand, and scanning it back in.",
                    ]}
                  />
                  <p>
                    A watermark doesn&apos;t just deter theft — it&apos;s proof. If your
                    name, logo, or a &ldquo;DRAFT&rdquo; mark is visibly embedded in a file,
                    anyone who sees it knows exactly where it came from and what state
                    it&apos;s in. For photographers especially, understanding ownership
                    basics helps — see{" "}
                    <BlogExternalLink href="https://www.copyright.gov/engage/photographers/">
                      What Photographers Should Know about Copyright
                    </BlogExternalLink>{" "}
                    from the U.S. Copyright Office.
                  </p>
                </div>

              <div className="landing-surface mt-10 rounded-2xl p-6 md:p-8">
                <p className="text-base font-semibold leading-7 text-beige md:text-lg">
                  Want to see how it works on your own file?
                </p>
                <div className="mt-4">
                  <LandingCta href="/watermark">Try watermarking free</LandingCta>
                </div>
              </div>
            </ArticleSection>

            <ArticleSection title="How to Watermark a Photo">
              <StepList
                items={[
                  {
                    title: "Upload your photo.",
                    body: "Drag it into the tool or select it from your device — JPG, PNG, and WebP are all supported. Nothing is uploaded to a server; the file stays in your browser.",
                  },
                  {
                    title: "Choose text or a logo.",
                    body: "Type your watermark text (your name, business, or website), or upload a logo image. You can also draw or type a signature if you're marking a document rather than a photo.",
                  },
                  {
                    title: "Position it.",
                    body: "Use the 3×3 position grid for a quick corner placement, or drag the watermark anywhere on the image for exact control.",
                  },
                  {
                    title: "Adjust opacity and size.",
                    body: "Make it subtle enough not to distract from the photo, or bold enough to make copying pointless.",
                  },
                  {
                    title: "Tile it for stronger protection (optional).",
                    body: (
                      <>
                        Instead of a single mark, repeat your watermark in a pattern across
                        the whole image — adjust the density, angle, and spacing so
                        it&apos;s difficult to crop out. Learn more about{" "}
                        <BlogInlineLink href="/features?tab=watermarking">
                          tiled watermarking
                        </BlogInlineLink>{" "}
                        in our features overview.
                      </>
                    ),
                  },
                  {
                    title: "Export.",
                    body: "Download the finished photo at full resolution, instantly.",
                  },
                ]}
              />
            </ArticleSection>

            <ArticleSection title="How to Watermark a PDF">
              <p>
                Watermarking a PDF works differently from a photo, because the document
                usually needs to stay readable and searchable — you&apos;re not just
                stamping an image, you&apos;re marking a real document. PDF is an open,
                standardized format maintained by the{" "}
                <BlogExternalLink href="https://pdfa.org/">PDF Association</BlogExternalLink>
                , which is why multi-page workflows stay consistent across tools.
              </p>
              <BulletList
                items={[
                  "Upload your PDF. Multi-page documents are supported; you'll see a thumbnail of every page.",
                  <>
                    Set your watermark once. Whatever text, logo, or signature you choose
                    applies consistently across every page — see our{" "}
                    <BlogInlineLink href="/features?tab=file-support">
                      PDF support features
                    </BlogInlineLink>{" "}
                    for how this works in the editor.
                  </>,
                  "Preview each page before exporting, to confirm the watermark placement works across different page layouts.",
                  "Export your watermarked PDF. The original document's text stays selectable and searchable — only the watermark itself is an image overlay, so you're not sacrificing document quality to protect it.",
                ]}
              />
              <p>
                This matters most for{" "}
                <LandingHighlight>contracts, proposals, and invoices</LandingHighlight>,
                where the recipient still needs to read and reference the actual text, not
                just see a flattened image of it.
              </p>
            </ArticleSection>

            <ArticleSection title="How to Watermark a Video">
              <BulletList
                items={[
                  "Upload your video. MP4, MOV, and WebM formats are supported.",
                  "Design your watermark exactly as you would for a photo — text, logo, position, opacity, and tiling all work the same way, live over your video preview.",
                  "Export. Short clips (under 60 seconds, up to 1080p) process instantly, right in your browser. Longer videos (up to 60 minutes) upload with resumable transfers and are processed on our servers. Nothing is stored afterward.",
                ]}
              />
            </ArticleSection>

            <ArticleSection title="Signing and Filling Documents Online">
              <p>
                On PDFs, use{" "}
                <BlogInlineLink href="/features?tab=watermarking">Sign & Fill</BlogInlineLink>{" "}
                to add signatures, initials, and typed fill-in fields:
              </p>
              <BulletList
                items={[
                  "Create your signature — draw it with your mouse or finger, or type your name and render it in a handwriting-style font.",
                  "Save it for reuse — keep your full signature and your initials separately, ready to use again in the same session.",
                  "Add fill-in text on PDF pages with Add Text when a form needs dates, names, or other typed answers.",
                  "Drag placements into place on any PDF page, and adjust size before exporting.",
                ]}
              />
              <p>
                This is useful for signing agreements, completing forms, approving proofs, or
                marking documents as reviewed — without printing, signing, and scanning.
              </p>
            </ArticleSection>

            <ArticleSection title="Watermarking Software vs. Browser-Based Tools">
              <p>
                PutWatermark uses a simple{" "}
                <BlogInlineLink href="/pricing">pay-as-you-go credit system</BlogInlineLink>{" "}
                rather than a subscription — here&apos;s how browser-based watermarking
                compares to traditional desktop software:
              </p>
              <div className="landing-surface mt-6 overflow-x-auto rounded-2xl">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="landing-border border-b">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-beige-dim md:px-6">
                        &nbsp;
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-beige-dim md:px-6">
                        Traditional Desktop Software
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-sand md:px-6">
                        Browser-Based (PutWatermark)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr
                        className="landing-border border-b last:border-b-0"
                        key={row.label}
                      >
                        <th className="px-5 py-4 align-top font-semibold text-beige md:px-6">
                          {row.label}
                        </th>
                        <td className="landing-muted px-5 py-4 align-top md:px-6">
                          {row.traditional}
                        </td>
                        <td className="px-5 py-4 align-top text-beige md:px-6">
                          {row.putwatermark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ArticleSection>

            <ArticleSection title="Further reading">
              <ul className="mt-2 space-y-3">
                <li>
                  <BlogExternalLink href="https://www.copyright.gov/engage/photographers/">
                    What Photographers Should Know about Copyright
                  </BlogExternalLink>{" "}
                  — U.S. Copyright Office guidance for photographers and visual creators.
                </li>
                <li>
                  <BlogExternalLink href="https://pdfa.org/">PDF Association</BlogExternalLink>{" "}
                  — the industry group behind the open PDF standard and best practices for
                  document workflows.
                </li>
              </ul>
            </ArticleSection>

            <ArticleSection title="Frequently Asked Questions">
              <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
                {blogFaqSchema.map((item) => (
                  <div className="px-6 py-5 md:px-8" key={item.question}>
                    <h3 className="text-base font-semibold text-beige md:text-lg">
                      {item.question}
                    </h3>
                    <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                      {item.question === "Is there a subscription?" ? (
                        <>
                          No. PutWatermark uses{" "}
                          <BlogInlineLink href="/pricing">
                            pay-as-you-go credits
                          </BlogInlineLink>{" "}
                          rather than a monthly subscription.
                        </>
                      ) : (
                        item.answer
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </ArticleSection>

            <div className="landing-surface mt-16 rounded-2xl p-8 md:p-10">
              <p className="text-lg font-semibold leading-8 text-beige md:text-xl">
                Ready to try it?{" "}
                <LandingHighlight>Watermark your first file free</LandingHighlight>
              </p>
              <div className="mt-6">
                <LandingCta href="/watermark">Open the editor</LandingCta>
              </div>
            </div>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
