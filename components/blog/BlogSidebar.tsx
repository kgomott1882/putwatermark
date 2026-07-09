import Link from "next/link";
import {
  blogPosts,
  getBlogCategoryCounts,
  getBlogTagCounts,
  getRecentBlogPosts,
} from "@/lib/blog/posts";

type BlogSidebarProps = {
  activeCategorySlug?: string;
  activeTag?: string;
  excludeSlug?: string;
};

export function BlogSidebar({
  activeCategorySlug,
  activeTag,
  excludeSlug,
}: BlogSidebarProps) {
  const recentPosts = getRecentBlogPosts(6).filter(
    (post) => post.slug !== excludeSlug,
  );
  const categories = getBlogCategoryCounts();
  const tags = getBlogTagCounts();

  return (
    <aside className="space-y-10">
      <section>
        <h2 className="text-lg font-bold tracking-[-0.03em] text-beige">
          Recent posts
        </h2>
        <ul className="mt-4 space-y-3">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link
                className="text-sm leading-6 text-sand underline decoration-sand/30 underline-offset-4 transition hover:text-beige hover:decoration-beige/50"
                href={`/blog/${post.slug}`}
              >
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-[-0.03em] text-beige">
          Posts by category
        </h2>
        <ul className="mt-4 space-y-2.5">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                className={`text-sm transition hover:text-beige ${
                  activeCategorySlug === category.slug
                    ? "font-semibold text-beige"
                    : "text-sand underline decoration-sand/30 underline-offset-4"
                }`}
                href={`/blog?category=${category.slug}`}
              >
                {category.label} ({category.count})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-[-0.03em] text-beige">
          Posts by tag
        </h2>
        <ul className="mt-4 space-y-2.5">
          {tags.map((tag) => (
            <li key={tag.label}>
              <Link
                className={`text-sm transition hover:text-beige ${
                  activeTag?.toLowerCase() === tag.label.toLowerCase()
                    ? "font-semibold text-beige"
                    : "text-sand underline decoration-sand/30 underline-offset-4"
                }`}
                href={`/blog?tag=${encodeURIComponent(tag.label.toLowerCase())}`}
              >
                {tag.label} ({tag.count})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {blogPosts.length > 0 ? (
        <section className="landing-surface rounded-2xl p-5">
          <p className="text-sm font-semibold text-beige">Try it free</p>
          <p className="landing-muted mt-2 text-sm leading-7">
            Watermark or sign a file in your browser — no account required to
            start.
          </p>
          <Link
            className="mt-4 inline-flex text-sm font-semibold text-sand transition hover:text-beige"
            href="/watermark"
          >
            Open the editor →
          </Link>
        </section>
      ) : null}
    </aside>
  );
}
