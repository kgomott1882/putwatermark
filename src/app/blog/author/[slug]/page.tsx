import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogAuthorPageContent } from "../../../../../components/blog/BlogAuthorPageContent";
import { JsonLd } from "../../../../../components/blog/JsonLd";
import { blogAuthors, getBlogAuthor } from "@/lib/blog/authors";
import { getPostsByAuthor } from "@/lib/blog/posts";

type AuthorPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogAuthors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getBlogAuthor(slug);

  if (!author) {
    return {};
  }

  const title = `${author.name} | PutWatermark Blog`;
  const description = `${author.credentials}. ${author.bio}`;

  return {
    alternates: {
      canonical: `/blog/author/${author.slug}`,
    },
    description,
    openGraph: {
      description,
      title,
      type: "profile",
      url: `https://putwatermark.com/blog/author/${author.slug}`,
    },
    title,
  };
}

export default async function BlogAuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const author = getBlogAuthor(slug);

  if (!author) {
    notFound();
  }

  const posts = getPostsByAuthor(slug);
  const authorJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    description: author.bio,
    mainEntity: {
      "@type": "Person",
      description: author.bio,
      jobTitle: author.credentials,
      name: author.name,
      url: `https://putwatermark.com/blog/author/${author.slug}`,
    },
    url: `https://putwatermark.com/blog/author/${author.slug}`,
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        url: `https://putwatermark.com/blog/${post.slug}`,
      },
      position: index + 1,
    })),
    name: `Articles by ${author.name}`,
  };

  return (
    <>
      <JsonLd data={[authorJsonLd, itemListJsonLd]} />
      <BlogAuthorPageContent authorSlug={slug} />
    </>
  );
}
