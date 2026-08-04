import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogBatchWatermarkArticle } from "../../../../components/blog/BlogBatchWatermarkArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  batchWatermarkFaqSchema,
  batchWatermarkHowToSchema,
  buildBlogPostJsonLd,
  getBlogPost,
} from "@/lib/blog/posts";

const slug = "how-to-batch-watermark-multiple-photos";
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
  mainEntity: batchWatermarkFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Batch Watermark Photos",
  step: batchWatermarkHowToSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function HowToBatchWatermarkBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, howToJsonLd, articleJsonLd]} />
      <BlogBatchWatermarkArticle post={post} />
    </>
  );
}
