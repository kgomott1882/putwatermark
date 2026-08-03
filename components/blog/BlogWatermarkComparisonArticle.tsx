"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BlogArticleLayout } from "./BlogArticleLayout";
import { BlogPostHero } from "./BlogPostHero";
import { Footer } from "../Footer";
import type { BlogPost } from "@/lib/blog/posts";
import {
  WATERMARK_COMPARISON_OPENING_DEFINITION,
  watermarkComparisonFaqSchema,
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

const comparisonRows = [
  {
    feature: "Platform",
    putWatermark: "Browser only",
    watermarkWs: "Browser only",
    visualWatermark: "Desktop software (download required)",
    watermarkly: "Browser, desktop, and mobile",
  },
  {
    feature: "Account needed to try it",
    putWatermark: "No",
    watermarkWs: "Not confirmed. Check their site",
    visualWatermark: "Not confirmed. Check their site",
    watermarkly: "No (free tier available)",
  },
  {
    feature: "Pricing model",
    putWatermark: "Pay as you go credits (don't expire for 60 days)",
    watermarkWs: "Subscription",
    visualWatermark: "One time or trial based license",
    watermarkly: "Free tier with paid upgrade; check current terms",
  },
  {
    feature: "Photos",
    putWatermark: "Yes",
    watermarkWs: "Yes",
    visualWatermark: "Yes",
    watermarkly: "Yes",
  },
  {
    feature: "Video",
    putWatermark: "Yes",
    watermarkWs: "Yes",
    visualWatermark: "Yes",
    watermarkly: "Yes",
  },
  {
    feature: "PDF",
    putWatermark: "Yes",
    watermarkWs: "Yes",
    visualWatermark: "Yes",
    watermarkly: "Yes",
  },
  {
    feature: "Sign & Fill (PDF)",
    putWatermark: "Yes",
    watermarkWs: "Not offered",
    visualWatermark: "Not offered",
    watermarkly: "Not offered",
  },
  {
    feature: "Free tier watermark",
    putWatermark: "Tiled overlay, removable via credits",
    watermarkWs: "Not confirmed. Check current terms",
    visualWatermark: "Not confirmed. Check current terms",
    watermarkly: "Adds their own branding to free exports",
  },
] as const;

type BlogWatermarkComparisonArticleProps = {
  post: BlogPost;
};

export function BlogWatermarkComparisonArticle({
  post,
}: BlogWatermarkComparisonArticleProps) {
  return (
    <main className="landing-theme">
      <article className="border-b border-beige/10">
        <BlogArticleLayout excludeSlug={post.slug}>
          <BlogPostHero post={post} />

          <p className="mt-8 max-w-3xl text-lg leading-8 text-beige md:text-xl md:leading-9">
            {WATERMARK_COMPARISON_OPENING_DEFINITION}
          </p>

          <p className="landing-muted mt-6 max-w-3xl text-base leading-8 md:text-[1.05rem]">
            This comparison focuses on those structural differences rather than specific
            prices or exact limits, since those details change over time. Check each
            provider&apos;s own site for current pricing before deciding.
          </p>

          <ArticleSection title="At a Glance">
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <table className="landing-surface w-full min-w-[52rem] border-collapse rounded-2xl text-left text-sm md:text-base">
                <thead>
                  <tr className="border-b border-beige/10">
                    <th className="px-4 py-4 font-semibold text-beige md:px-6" scope="col" />
                    <th className="px-4 py-4 font-semibold text-beige md:px-6" scope="col">
                      PutWatermark
                    </th>
                    <th className="px-4 py-4 font-semibold text-beige md:px-6" scope="col">
                      Watermark.ws
                    </th>
                    <th className="px-4 py-4 font-semibold text-beige md:px-6" scope="col">
                      Visual Watermark
                    </th>
                    <th className="px-4 py-4 font-semibold text-beige md:px-6" scope="col">
                      Watermarkly
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige/10">
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <th
                        className="landing-muted px-4 py-4 align-top font-medium md:px-6"
                        scope="row"
                      >
                        {row.feature}
                      </th>
                      <td className="px-4 py-4 align-top text-beige md:px-6">
                        {row.putWatermark}
                      </td>
                      <td className="px-4 py-4 align-top text-beige md:px-6">
                        {row.watermarkWs}
                      </td>
                      <td className="px-4 py-4 align-top text-beige md:px-6">
                        {row.visualWatermark}
                      </td>
                      <td className="px-4 py-4 align-top text-beige md:px-6">
                        {row.watermarkly}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="landing-muted mt-6 text-sm leading-7 md:text-base">
              Comparison compiled from each provider&apos;s own site and publicly available
              information at the time of writing. Pricing, plans, and features change.
              Confirm current details directly with each provider before deciding.
            </p>
          </ArticleSection>

          <ArticleSection title="What Each Tool Is Actually Best At">
            <p>
              <strong className="text-beige">Watermark.ws</strong> is a fully browser based
              tool covering photos, video, PDFs, and animated GIFs, with batch processing and
              saved templates. It&apos;s built around a subscription, so it suits people
              who&apos;ll use it regularly enough that a recurring plan makes sense.
            </p>
            <p>
              <strong className="text-beige">Visual Watermark</strong> is genuinely different
              from the other three in one respect: it&apos;s desktop software you download
              and run locally, rather than a browser tool. For anyone who specifically wants
              processing to happen entirely on their own machine, with no browser dependency at
              all. This is the most direct fit among the options here.
            </p>
            <p>
              <strong className="text-beige">Watermarkly</strong> is the most flexible on
              platform, available as a web app, desktop app, and mobile app, which matters if
              you want the same tool across different devices. Its free tier works similarly
              to a preview model. Exports are watermarked with Watermarkly&apos;s own
              branding until you upgrade.
            </p>
            <p>
              <strong className="text-beige">PutWatermark</strong> is browser only by design.
              No desktop app, no mobile app, nothing to install anywhere. Trying it
              doesn&apos;t require an account at all; one is only needed once you&apos;re
              ready to move beyond the free tier&apos;s tiled watermark. Pricing is
              credit based rather than a subscription, and credits don&apos;t expire for 60
              days once purchased.               It&apos;s also currently the only one of the four with built in Sign & Fill for
              PDFs (signatures, initials, and fill in text fields) alongside the
              watermarking features the others share.
            </p>
          </ArticleSection>

          <ArticleSection title="Which One Actually Fits Your Situation">
            <BulletList
              items={[
                <>
                  You want zero installation, ever, on any device, and prefer not to commit to
                  a subscription. PutWatermark&apos;s browser only, pay as you go model
                  fits this directly.
                </>,
                <>
                  You&apos;ll use a watermarking tool often enough that a subscription makes
                  sense, and want an established browser based option. Watermark.ws is a
                  reasonable fit.
                </>,
                <>
                  You specifically want local, offline processing with no browser involved at
                  all. Visual Watermark is the one built around that.
                </>,
                <>
                  You want the same tool across desktop, mobile, and browser
                  interchangeably. Watermarkly&apos;s multi platform approach covers that
                  need most directly.
                </>,
                <>
                  You need to sign or fill a PDF as well as watermark photos, without
                  switching tools. This is currently unique to PutWatermark among the four.
                </>,
              ]}
            />
          </ArticleSection>

          <ArticleSection title="Frequently Asked Questions">
            <div className="landing-surface mt-6 divide-y divide-beige/10 rounded-2xl">
              {watermarkComparisonFaqSchema.map((item) => (
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
            Want to try the browser only, pay as you go option?{" "}
            <BlogInlineLink href="/watermark">Open the editor</BlogInlineLink>
          </p>
        </BlogArticleLayout>
      </article>

      <Footer />
    </main>
  );
}
