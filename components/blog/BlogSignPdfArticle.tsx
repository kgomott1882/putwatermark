"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import { SIGN_PDF_OPENING_DEFINITION, signPdfFaqSchema } from "@/lib/blog/posts";

const WATERMARK_BLOG_HREF =
  "/blog/how-to-watermark-photos-pdfs-videos-online-free";
const ESIGN_ACT_URL =
  "https://www.govinfo.gov/content/pkg/PLAW-106publ229/html/PLAW-106publ229.htm";

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
            <div className="landing-muted mt-1 space-y-2 text-sm leading-7 md:text-base">
              {item.body}
            </div>
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

type BlogSignPdfArticleProps = {
  post: BlogPost;
};

export function BlogSignPdfArticle({ post }: BlogSignPdfArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {SIGN_PDF_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This guide walks through exactly how to sign a PDF online, when an
            electronic signature is legally sufficient, and what to watch for with
            different signing tools.
          </p>

          <ArticleSection title="Why Sign Documents Online Instead of on Paper">
            <div className="space-y-5">
                  <p>
                    The traditional process — print, sign, scan, email — is slow and
                    easy to mess up (a bad scan, a signature that doesn&apos;t line up,
                    a missing page). Signing directly on the PDF avoids all of that:
                  </p>
                  <BulletList
                    items={[
                      "Freelancers and contractors can sign and return a contract in under a minute instead of hunting for a printer.",
                      "Small businesses can get proposals and invoices signed by clients without a back-and-forth of attachments.",
                      "Anyone reviewing a document — a lease, a form, a permission slip — can approve it on the spot, from a phone or laptop.",
                    ]}
                  />
                  <p>
                    This isn&apos;t a workaround or a lesser version of &ldquo;really&rdquo;
                    signing something. In the U.S., electronic signatures carry the same
                    legal weight as handwritten ones for the vast majority of contracts and
                    agreements, as long as both parties intended to sign and agreed to do
                    business electronically — see{" "}
                    <BlogInlineLink href={WATERMARK_BLOG_HREF}>
                      How to Watermark Photos, PDFs, and Videos Online for Free
                    </BlogInlineLink>{" "}
                    for how the same document can be watermarked alongside signing, if you
                    also need to mark it as a draft or protect it from being copied.
                  </p>
                </div>
          </ArticleSection>

            <ArticleSection title="How to Sign a PDF Online, Step by Step">
              <StepList
                items={[
                  {
                    title: "Upload your PDF.",
                    body: "Drag it into the tool or select it from your device. Multi-page documents are supported, and the file stays in your browser while you edit and sign.",
                  },
                  {
                    title: "Create your signature.",
                    body: (
                      <>
                        <p>You have two options:</p>
                        <ul className="mt-2 list-disc space-y-2 pl-5">
                          <li>
                            Draw it with your mouse, trackpad, or finger on a touchscreen,
                            just like signing on paper.
                          </li>
                          <li>
                            Type your name and have it rendered in a handwriting-style
                            script font, if you&apos;d rather not draw with a mouse.
                          </li>
                        </ul>
                      </>
                    ),
                  },
                  {
                    title: "Save it for reuse.",
                    body: "Keep your full signature and your initials as two separate saved options, so you don't have to redraw them for every page or every document in the same session.",
                  },
                  {
                    title: "Drag your signature into place on the page.",
                    body: "Resize it if needed, and adjust its position precisely — this isn't a fixed stamp in the corner, you control exactly where it lands.",
                  },
                  {
                    title:
                      "Repeat for any additional pages that need a signature or initials.",
                    body: "Apply the same saved signature or initials to every page that requires it before you export.",
                  },
                  {
                    title: "Add fill-in text fields (optional).",
                    body: "Use Add Text to place typed fields on pages that need dates, names, or other fill-ins. Each fill page costs 55 credits on export (50 for the page plus a 5-credit fill surcharge).",
                  },
                  {
                    title: "Download your signed PDF.",
                    body: "The rest of the document is untouched — your signatures, initials, and fill-text fields are added as overlays, and the underlying text stays selectable and searchable, so the document is still fully usable, not flattened into an image.",
                  },
                ]}
              />
            </ArticleSection>

            <ArticleSection title="When Is an Electronic Signature Legally Valid?">
              <p>
                In the United States, two laws govern this: the Electronic Signatures in
                Global and National Commerce Act (
                <BlogExternalLink href={ESIGN_ACT_URL}>ESIGN Act</BlogExternalLink>
                ), a federal law passed in 2000, and the Uniform Electronic Transactions
                Act (UETA), adopted by nearly every U.S. state. Together, they establish
                that an electronic signature can&apos;t be denied legal effect purely
                because it&apos;s in electronic form.
              </p>
              <p>For a signature to hold up, four things generally need to be true:</p>
              <BulletList
                items={[
                  "Intent to sign — both parties meant to sign, not accidentally clicked something.",
                  "Consent to do business electronically — both sides agreed to handle the transaction digitally.",
                  "The signature is associated with the record — it's clearly tied to the specific document being signed.",
                  "The signed document can be retained and reproduced — both parties can access and keep a copy.",
                ]}
              />
              <p>
                Some documents are excluded from electronic signing regardless of these
                conditions — wills, certain court orders, and a handful of other specific
                categories. For anything else — contracts, proposals, invoices, agreements,
                forms — an electronic signature is typically just as binding as a wet-ink
                one.
              </p>
              <p className="landing-muted text-sm leading-7 md:text-base">
                (This is general information, not legal advice. If a specific
                document&apos;s validity matters a lot to you, it&apos;s worth confirming
                with a lawyer for your situation. See our{" "}
                <BlogInlineLink href="/disclaimer">Disclaimer</BlogInlineLink> for more
                detail.)
              </p>
            </ArticleSection>

            <ArticleSection title="Drawn vs. Typed Signatures: Which Should You Use?">
              <p>
                Both are legitimate electronic signatures under the law described above —
                the legal validity comes from intent and consent, not from the specific
                visual method used to create the mark.
              </p>
              <BulletList
                items={[
                  "Draw it if you want something that looks like your actual handwriting, or if you're signing on a touchscreen where drawing feels natural.",
                  "Type it if you're on a laptop without a trackpad you trust for drawing, or you just want something clean and consistent every time — typing your name renders it in a handwriting-style font rather than plain typed text, so it still reads as a signature rather than a label.",
                  "Save one of each if you're not sure — you can switch between them per document.",
                ]}
              />
            </ArticleSection>

            <ArticleSection title="Signing vs. Watermarking: Not the Same Thing">
              <p>
                It&apos;s worth being clear on the difference, since both can apply to the
                same PDF:
              </p>
              <BulletList
                items={[
                  "A signature indicates you (or someone) reviewed, approved, or agreed to a specific document.",
                  <>
                    A watermark protects a document or file from unauthorized use or copying,
                    and doesn&apos;t imply approval — a &ldquo;DRAFT&rdquo; watermark, for
                    example, means the opposite of a finished, signed agreement.
                  </>,
                ]}
              />
              <p>
                You can use both on the same PDF — sign a contract and watermark it
                &ldquo;COPY&rdquo; for the version you send before the final signed
                original, for instance. The{" "}
                <BlogInlineLink href={WATERMARK_BLOG_HREF}>
                  guide to watermarking photos, PDFs, and videos
                </BlogInlineLink>{" "}
                covers how watermarking works when you need draft marks or copy protection
                on the same file.
              </p>
            </ArticleSection>

            <ArticleSection title="Frequently Asked Questions">
              <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
                {signPdfFaqSchema.map((item) => (
                  <div className="px-6 py-5 md:px-8" key={item.question}>
                    <h3 className="text-base font-semibold text-beige md:text-lg">
                      {item.question}
                    </h3>
                    <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                      {item.question === "Is there a subscription to sign documents?" ? (
                        <>
                          No. There is no monthly subscription — only{" "}
                          <BlogInlineLink href="/pricing">pay-as-you-go credits</BlogInlineLink>{" "}
                          when you need additional volume or paid features.
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
              Ready to sign your first document?{" "}
              <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
            </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
