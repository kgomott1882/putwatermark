import Link from "next/link";
import type { BlogAuthor } from "@/lib/blog/authors";
import { getAuthorInitials } from "@/lib/blog/authors";
import type { BlogPost } from "@/lib/blog/posts";

type BlogAuthorBylineProps = {
  author: BlogAuthor;
  post: BlogPost;
  showUpdatedLabel?: boolean;
};

function formatBlogDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function BlogAuthorByline({
  author,
  post,
  showUpdatedLabel = true,
}: BlogAuthorBylineProps) {
  const authorHref = `/blog/author/${author.slug}`;
  const categoryHref = `/blog?category=${post.categorySlug}`;
  const dateLabel = showUpdatedLabel ? "Updated" : "Published";

  return (
    <div className="flex items-start gap-3">
      <Link
        aria-label={`View author page for ${author.name}`}
        className="group shrink-0"
        href={authorHref}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-beige/10 bg-night-elevated text-sm font-semibold text-sand transition group-hover:border-sand/40 group-hover:text-beige">
          {getAuthorInitials(author.name)}
        </span>
      </Link>

      <p className="text-sm leading-7 text-beige-dim">
        <span className="text-beige">by </span>
        <Link
          className="font-semibold text-sand underline decoration-sand/30 underline-offset-4 transition hover:text-beige hover:decoration-beige/50"
          href={authorHref}
        >
          {author.name}
        </Link>
        <span className="text-beige-dim"> · </span>
        <Link
          className="text-sand underline decoration-sand/30 underline-offset-4 transition hover:text-beige hover:decoration-beige/50"
          href={authorHref}
          title={author.credentials}
        >
          {author.credentials}
        </Link>
        <span className="text-beige-dim"> · </span>
        {dateLabel} {formatBlogDate(post.dateModified)}
        <span className="text-beige-dim"> · </span>
        Posted in{" "}
        <Link
          className="text-sand underline decoration-sand/30 underline-offset-4 transition hover:text-beige hover:decoration-beige/50"
          href={categoryHref}
        >
          {post.category}
        </Link>
      </p>
    </div>
  );
}
