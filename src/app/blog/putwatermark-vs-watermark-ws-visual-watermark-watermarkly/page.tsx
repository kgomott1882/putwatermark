import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogWatermarkComparisonArticle } from "../../../../components/blog/BlogWatermarkComparisonArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  watermarkComparisonFaqSchema,
} from "@/lib/blog/posts";

const slug = "putwatermark-vs-watermark-ws-visual-watermark-watermarkly";
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
  mainEntity: watermarkComparisonFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function WatermarkComparisonBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, articleJsonLd]} />
      <BlogWatermarkComparisonArticle post={post} />
    </>
  );
}
