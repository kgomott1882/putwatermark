import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogAiWatermarkProtectionArticle } from "../../../../components/blog/BlogAiWatermarkProtectionArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  aiWatermarkProtectionFaqSchema,
  buildBlogPostJsonLd,
  getBlogPost,
  protectPhotoPreviewsHowToSchema,
} from "@/lib/blog/posts";

const slug = "ai-watermark-removal-protection";
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
  mainEntity: aiWatermarkProtectionFaqSchema.map((item) => ({
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
  name: "How to Protect Photo Proofs Before Purchase",
  step: protectPhotoPreviewsHowToSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function AiWatermarkRemovalProtectionBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, howToJsonLd, articleJsonLd]} />
      <BlogAiWatermarkProtectionArticle post={post} />
    </>
  );
}
