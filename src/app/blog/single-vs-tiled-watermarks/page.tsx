import type { Metadata } from "next";
import { BlogSingleVsTiledWatermarkArticle } from "../../../../components/blog/BlogSingleVsTiledWatermarkArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  singleVsTiledFaqSchema,
} from "@/lib/blog/posts";

const slug = "single-vs-tiled-watermarks";
const post = getBlogPost(slug)!;

const canonicalUrl = `https://putwatermark.com/blog/${slug}`;

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
  mainEntity: singleVsTiledFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function SingleVsTiledWatermarksBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, articleJsonLd]} />
      <BlogSingleVsTiledWatermarkArticle post={post} />
    </>
  );
}
