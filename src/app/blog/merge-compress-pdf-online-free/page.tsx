import type { Metadata } from "next";
import { BlogMergeCompressPdfArticle } from "../../../../components/blog/BlogMergeCompressPdfArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  compressPdfHowToSchema,
  getBlogPost,
  mergeCompressPdfFaqSchema,
  mergePdfHowToSchema,
} from "@/lib/blog/posts";

const slug = "merge-compress-pdf-online-free";
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
  mainEntity: mergeCompressPdfFaqSchema.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const mergeHowToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Merge PDFs Online",
  step: mergePdfHowToSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const compressHowToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Compress a PDF Online",
  step: compressPdfHowToSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function MergeCompressPdfBlogPostPage() {
  return (
    <>
      <JsonLd
        data={[faqJsonLd, mergeHowToJsonLd, compressHowToJsonLd, articleJsonLd]}
      />
      <BlogMergeCompressPdfArticle post={post} />
    </>
  );
}
