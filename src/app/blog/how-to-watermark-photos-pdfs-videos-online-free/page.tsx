import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogPostArticle } from "../../../../components/blog/BlogPostArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  blogFaqSchema,
  buildBlogPostJsonLd,
  getBlogPost,
  howToPhotoSchema,
} from "@/lib/blog/posts";

const slug = "how-to-watermark-photos-pdfs-videos-online-free";
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
  mainEntity: blogFaqSchema.map((item) => ({
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
  name: "How to Watermark a Photo Online",
  step: howToPhotoSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function HowToWatermarkBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, howToJsonLd, articleJsonLd]} />
      <BlogPostArticle post={post} />
    </>
  );
}
