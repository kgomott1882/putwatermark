import type { MetadataRoute } from "next";
import { blogAuthors } from "../lib/blog/authors";
import { blogPosts } from "../lib/blog/posts";
import { getSiteUrl } from "../lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: baseUrl,
    },
    {
      changeFrequency: "weekly",
      priority: 0.9,
      url: `${baseUrl}/pricing`,
    },
    {
      changeFrequency: "weekly",
      priority: 0.85,
      url: `${baseUrl}/features`,
    },
    {
      changeFrequency: "weekly",
      priority: 0.85,
      url: `${baseUrl}/watermark`,
    },
    {
      changeFrequency: "monthly",
      priority: 0.8,
      url: `${baseUrl}/about`,
    },
    {
      changeFrequency: "weekly",
      priority: 0.8,
      url: `${baseUrl}/blog`,
    },
    {
      changeFrequency: "yearly",
      priority: 0.3,
      url: `${baseUrl}/privacy`,
    },
    {
      changeFrequency: "yearly",
      priority: 0.3,
      url: `${baseUrl}/terms`,
    },
    {
      changeFrequency: "yearly",
      priority: 0.3,
      url: `${baseUrl}/refund-policy`,
    },
    {
      changeFrequency: "yearly",
      priority: 0.3,
      url: `${baseUrl}/disclaimer`,
    },
  ];

  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    changeFrequency: "monthly",
    lastModified: new Date(post.dateModified || post.datePublished),
    priority: 0.65,
    url: `${baseUrl}/blog/${post.slug}`,
  }));

  const authorPages: MetadataRoute.Sitemap = blogAuthors.map((author) => ({
    changeFrequency: "monthly",
    priority: 0.5,
    url: `${baseUrl}/blog/author/${author.slug}`,
  }));

  return [...staticPages, ...blogPostPages, ...authorPages];
}
