import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/siteUrl";
import { BlogSignPdfArticle } from "../../../../components/blog/BlogSignPdfArticle";
import { JsonLd } from "../../../../components/blog/JsonLd";
import {
  buildBlogPostJsonLd,
  getBlogPost,
  signPdfFaqSchema,
  signPdfHowToSchema,
} from "@/lib/blog/posts";

const slug = "how-to-sign-a-pdf-online-free";
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
  mainEntity: signPdfFaqSchema.map((item) => ({
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
  name: "How to Sign a PDF Online",
  step: signPdfHowToSchema.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const articleJsonLd = buildBlogPostJsonLd(post);

export default function HowToSignPdfBlogPostPage() {
  return (
    <>
      <JsonLd data={[faqJsonLd, howToJsonLd, articleJsonLd]} />
      <BlogSignPdfArticle post={post} />
    </>
  );
}
