"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BlogAuthorByline } from "./BlogAuthorByline";
import { BlogSidebar } from "./BlogSidebar";
import { Footer } from "../Footer";
import { LandingSectionHeader } from "../landing/LandingPrimitives";
import { pageContainerClass } from "../pageContainer";
import { getBlogAuthor } from "@/lib/blog/authors";
import {
  blogPosts,
  getFeaturedBlogPost,
  getPostsByCategory,
  getPostsByTag,
} from "@/lib/blog/posts";

function BlogIndexContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const tagFilter = searchParams.get("tag");

  const filteredPosts = categoryFilter
    ? getPostsByCategory(categoryFilter)
    : tagFilter
      ? getPostsByTag(tagFilter)
      : blogPosts;

  const featuredPost = categoryFilter || tagFilter ? null : getFeaturedBlogPost();
  const listPosts =
    featuredPost === null
      ? [...filteredPosts].sort(
          (left, right) =>
            new Date(right.datePublished).getTime() -
            new Date(left.datePublished).getTime(),
        )
      : filteredPosts.filter((post) => post.slug !== featuredPost.slug);

  const filterLabel = categoryFilter
    ? getPostsByCategory(categoryFilter)[0]?.category
    : tagFilter
      ? tagFilter
      : null;

  return (
    <main className="landing-theme">
      <section className="landing-section border-b">
        <div className={pageContainerClass}>
          <LandingSectionHeader
            index="Blog"
            lead="Guides and tips for watermarking photos, PDFs, and video in your browser."
            title={filterLabel ? `Posts: ${filterLabel}` : "From the blog"}
          />

          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              {filterLabel ? (
                <p className="landing-muted mb-8 text-sm">
                  <Link className="text-sand transition hover:text-beige" href="/blog">
                    ← View all posts
                  </Link>
                </p>
              ) : null}

              {featuredPost ? (
                <article className="border-b border-beige/10 pb-12">
                  <p className="max-w-3xl text-base leading-8 text-beige md:text-lg md:leading-9">
                    {featuredPost.excerpt}
                  </p>

                  <Link
                    className="mt-6 inline-flex rounded-full bg-signal px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-night transition hover:bg-signal/90"
                    href={`/blog/${featuredPost.slug}`}
                  >
                    Continue reading…
                  </Link>

                  <Link
                    className="mt-8 block overflow-hidden rounded-[1.75rem] landing-border border"
                    href={`/blog/${featuredPost.slug}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={featuredPost.imageAlt}
                      className="aspect-[16/9] w-full object-cover transition duration-700 hover:scale-[1.02]"
                      decoding="async"
                      src={featuredPost.image}
                    />
                  </Link>

                  <h2 className="mt-8 text-3xl font-bold tracking-[-0.04em] text-beige md:text-[2rem]">
                    <Link
                      className="transition hover:text-sand"
                      href={`/blog/${featuredPost.slug}`}
                    >
                      {featuredPost.title}
                    </Link>
                  </h2>

                  {(() => {
                    const author = getBlogAuthor(featuredPost.authorSlug);
                    return author ? (
                      <div className="mt-5">
                        <BlogAuthorByline author={author} post={featuredPost} />
                      </div>
                    ) : null;
                  })()}
                </article>
              ) : null}

              {listPosts.length > 0 ? (
                <div className={featuredPost ? "mt-12 space-y-12" : "space-y-12"}>
                  {listPosts.map((post) => {
                    const author = getBlogAuthor(post.authorSlug);
                    const href = `/blog/${post.slug}`;

                    return (
                      <article
                        className="border-b border-beige/10 pb-12 last:border-b-0 last:pb-0"
                        key={post.slug}
                      >
                        <p className="max-w-3xl text-base leading-8 text-beige md:text-lg md:leading-9">
                          {post.excerpt}
                        </p>

                        <Link
                          className="mt-6 inline-flex rounded-full border border-sand/40 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-sand transition hover:border-sand hover:bg-sand/10 hover:text-beige"
                          href={href}
                        >
                          Continue reading…
                        </Link>

                        <Link
                          className="mt-8 block overflow-hidden rounded-[1.75rem] landing-border border"
                          href={href}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={post.imageAlt}
                            className="aspect-[16/9] w-full object-cover transition duration-700 hover:scale-[1.02]"
                            decoding="async"
                            src={post.image}
                          />
                        </Link>

                        <h2 className="mt-8 text-2xl font-bold tracking-[-0.04em] text-beige md:text-[1.75rem]">
                          <Link className="transition hover:text-sand" href={href}>
                            {post.title}
                          </Link>
                        </h2>

                        {author ? (
                          <div className="mt-5">
                            <BlogAuthorByline author={author} post={post} />
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="landing-muted text-base leading-8">
                  No posts match this filter yet.
                </p>
              )}
            </div>

            <BlogSidebar
              activeCategorySlug={categoryFilter ?? undefined}
              activeTag={tagFilter ?? undefined}
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export function BlogIndexClient() {
  return (
    <Suspense fallback={null}>
      <BlogIndexContent />
    </Suspense>
  );
}
