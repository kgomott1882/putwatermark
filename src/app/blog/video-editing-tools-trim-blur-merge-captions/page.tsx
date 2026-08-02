import type { Metadata } from "next";
import { BlogVideoEditingToolsArticle } from "../../../../components/blog/BlogVideoEditingToolsArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  videoEditingToolsFaqSchema,
} from "@/lib/blog/posts";

const slug = "video-editing-tools-trim-blur-merge-captions";
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
  mainEntity: videoEditingToolsFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function VideoEditingToolsBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, articleJsonLd]} />
      <BlogVideoEditingToolsArticle post={post} />
    </>
  );
}
