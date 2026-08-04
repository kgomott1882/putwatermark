import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogWatermarkVideoArticle } from "../../../../components/blog/BlogWatermarkVideoArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  watermarkVideoFaqSchema,
} from "@/lib/blog/posts";

const slug = "how-to-watermark-a-video-online-free";
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
  mainEntity: watermarkVideoFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function HowToWatermarkVideoBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, articleJsonLd]} />
      <BlogWatermarkVideoArticle post={post} />
    </>
  );
}
