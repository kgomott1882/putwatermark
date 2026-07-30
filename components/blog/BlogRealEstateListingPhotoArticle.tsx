"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  REAL_ESTATE_PHOTO_OPENING_DEFINITION,
  realEstatePhotoFaqSchema,
} from "@/lib/blog/posts";

const BATCH_WATERMARK_BLOG_HREF =
  "/blog/how-to-batch-watermark-multiple-photos";
const NAR_MLS_PHOTO_URL =
  "https://www.nar.realtor/about-nar/policies/mls-policy/use-of-photographs-in-a-multiple-listing-service";

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

type BlogRealEstateListingPhotoArticleProps = {
  post: BlogPost;
};

export function BlogRealEstateListingPhotoArticle({
  post,
}: BlogRealEstateListingPhotoArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {REAL_ESTATE_PHOTO_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This surprises a lot of people in the industry, and it matters more than it
            sounds like it should: reusing photos past the license&apos;s terms, after a
            listing expires, or once an agent moves to a new brokerage is a common way real
            estate professionals end up on the wrong side of a copyright claim without
            realizing it.
          </p>

          <ArticleSection title="Why This Catches People Off Guard">
            <p>
              The typical path a listing photo takes looks like this: a photographer is
              hired (often through the brokerage), shoots the property, and delivers the
              images. The agent uses them to market the listing. Everyone assumes
              that&apos;s the end of it. But unless the agreement with the photographer
              explicitly transfers ownership, what actually happened is narrower — a
              license, usually limited to marketing that specific listing while it&apos;s
              active.
            </p>
            <p>This creates a few common situations where people unintentionally cross a line:</p>
            <BulletList
              items={[
                "A listing expires and gets relisted with a new agent, who reuses the previous agent's photos without realizing the license didn't carry over.",
                "An agent changes brokerages and takes past listing photos into their new marketing materials, assuming personal ownership.",
                "Photos get pulled from an old MLS entry or a site like Zillow and reused on social media or a new listing, without checking whether the license period has ended.",
              ]}
            />
            <p>
              None of these are usually done with bad intent — they happen because most
              people assume paying for a photo shoot means owning the results, the same way
              buying a print or a product would. Copyright doesn&apos;t work that way; a
              license is a specific, often time-limited grant of permission, not a
              transfer of ownership.
            </p>
            <p>
              Copyright infringement carries real statutory penalties in the U.S. — under
              federal law, damages can range from several hundred to well over $100,000 per
              infringed work, even without having to prove specific financial loss. With a
              typical listing containing dozens of photos, the numbers can add up fast if a
              dispute actually escalates. (See the{" "}
              <BlogExternalLink href={NAR_MLS_PHOTO_URL}>
                National Association of REALTORS&apos; overview of copyright considerations
                for MLS photographs
              </BlogExternalLink>{" "}
              for a fuller explanation of how licensing works in this context.)
            </p>
          </ArticleSection>

          <ArticleSection title="Important: Check Your MLS's Rules Before Watermarking Listing Photos">
            <p>
              This is the part that&apos;s easy to miss: many Multiple Listing Services
              explicitly prohibit watermarks, logos, or branding on photos submitted to the
              MLS itself. Rules vary by MLS, but restrictions on branding, contact
              information, or visible marks on submitted listing images are common,
              precisely because MLS photo feeds are meant to display the property, not
              advertise the photographer or agent.
            </p>
            <p>
              So before watermarking anything destined for MLS submission, check your
              specific MLS&apos;s photo rules. Watermarking makes the most sense in the
              situations below — not as something to slap onto every listing photo
              indiscriminately.
            </p>
          </ArticleSection>

          <ArticleSection title="Where Watermarking Real Estate Photos Actually Helps">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Photographers protecting their own portfolio.</strong>{" "}
                  Before photos are delivered or licensed to an agent, a photographer
                  showing sample work on their own website or in proofs sent to a client has
                  every reason to watermark it — this is their own copyrighted work, and it
                  hasn&apos;t yet reached the stage where MLS restrictions would even apply.
                </>,
                <>
                  <strong className="text-beige">Marketing materials outside the MLS.</strong>{" "}
                  An agent&apos;s own website, social media posts, printed brochures, or
                  email campaigns aren&apos;t governed by MLS photo rules the way the MLS
                  feed itself is — watermarking here (with the agent or brokerage&apos;s own
                  branding, on photos they&apos;re licensed to use this way) is usually fine,
                  but still worth confirming against the specific licensing terms agreed with
                  the photographer.
                </>,
                <>
                  <strong className="text-beige">
                    Protecting photos of expired or withdrawn listings.
                  </strong>{" "}
                  If a property doesn&apos;t sell and the listing expires, a
                  photographer&apos;s watermark on their working copies makes it easy to
                  tell, at a glance, whether a photo reappearing on a new listing was
                  properly re-licensed or just reused.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="How to Watermark Real Estate Photos">
            <BulletList
              items={[
                <>
                  <strong className="text-beige">Upload the full set of photos at once.</strong>{" "}
                  A single property shoot easily produces 20–40+ images — batch upload lets
                  you apply one watermark setup across all of them instead of repeating the
                  process per photo.
                </>,
                <>
                  <strong className="text-beige">
                    Use your logo or business name, positioned consistently
                  </strong>{" "}
                  (a corner placement is standard for real estate marketing, since it
                  doesn&apos;t obscure the property itself).
                </>,
                <>
                  <strong className="text-beige">Keep opacity moderate.</strong> The goal is
                  visible attribution, not obscuring the photo a potential buyer is trying to
                  evaluate.
                </>,
                <>
                  <strong className="text-beige">
                    Export the batch as a single ZIP
                  </strong>
                  , watermarked consistently across the whole set.
                </>,
              ]}
            />
            <p>
              For sample proofs or situations where stronger protection matters more than a
              clean marketing look (for example, sharing draft images with a client before a
              licensing agreement is finalized), a tiled, repeating watermark makes an image
              far less useful if screenshotted or reused without permission.
            </p>
          </ArticleSection>

          <ArticleSection title="Signing Documents Alongside the Photos">
            <p>
              Real estate work involves as much paperwork as photography — disclosures,
              listing agreements, offers, and licensing agreements with photographers all
              typically need a signature. The same tool used to watermark listing photos also
              supports Sign & Fill on PDFs — draw or type a signature, add initials, or place
              fill-in text fields — which is useful for the document side of a transaction
              without needing separate software.
            </p>
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {realEstatePhotoFaqSchema.map((item) => (
                <div className="px-6 py-5 md:px-8" key={item.question}>
                  <h3 className="text-base font-semibold text-beige md:text-lg">
                    {item.question}
                  </h3>
                  <p className="landing-muted mt-3 text-sm leading-7 md:text-base">
                    {item.question ===
                    "Can I batch watermark all the photos from a property shoot at once?" ? (
                      <>
                        Yes — upload the full set and apply one watermark setup across all
                        of them, then export as a ZIP. See the{" "}
                        <BlogInlineLink href={BATCH_WATERMARK_BLOG_HREF}>
                          batch watermarking guide
                        </BlogInlineLink>{" "}
                        for the full walkthrough.
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
            Ready to protect a set of listing photos?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
