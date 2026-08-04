import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogWatermarkVisibilityTimingArticle } from "../../../../components/blog/BlogWatermarkVisibilityTimingArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  watermarkVisibilityTimingFaqSchema,
} from "@/lib/blog/posts";

const slug = "watermark-visibility-timing-video";
const post = getBlogPost(slug)!;

const canonicalUrl = getAbsoluteUrl(`/blog/${slug}`);

export const metadata: Metadata = {
  title: post.metaTitle,
  description: post.metaDescription,
  alternates: {
    canonical: `/blog/${slug}`,
  },
  openGraph: {
    title: post.metaTitle,
    description: post.metaDescription,
    type: "article",
    publishedTime: post.datePublished,
    url: canonicalUrl,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: watermarkVisibilityTimingFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function WatermarkVisibilityTimingBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, articleJsonLd]} />
      <BlogWatermarkVisibilityTimingArticle post={post} />
    </>
  );
}
