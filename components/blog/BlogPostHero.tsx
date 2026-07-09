import Link from "next/link";
import { BlogAuthorByline } from "./BlogAuthorByline";
import { getBlogAuthor } from "@/lib/blog/authors";
import type { BlogPost } from "@/lib/blog/posts";

type BlogPostHeroProps = {
  post: BlogPost;
};

export function BlogPostHero({ post }: BlogPostHeroProps) {
  const author = getBlogAuthor(post.authorSlug);

  if (!author) {
    return null;
  }

  return (
    <header className="pt-10 md:pt-14">
      <Link
        className="landing-muted text-sm font-medium transition hover:text-sand"
        href="/blog"
      >
        ← Back to Blog
      </Link>

      <div className="mt-8 overflow-hidden rounded-[1.75rem] landing-border border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={post.imageAlt}
          className="aspect-[16/9] w-full object-cover"
          decoding="async"
          src={post.image}
        />
      </div>

      <h1 className="mt-8 max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.05em] text-beige md:text-5xl lg:text-[3.15rem]">
        {post.title}
      </h1>

      <div className="mt-6">
        <BlogAuthorByline author={author} post={post} />
      </div>
    </header>
  );
}
