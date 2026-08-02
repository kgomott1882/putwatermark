import Link from "next/link";
import { BlogAuthorByline } from "./BlogAuthorByline";
import { BlogSidebar } from "./BlogSidebar";
import { Footer } from "../Footer";
import { pageContainerClass } from "../pageContainer";
import { getBlogAuthor } from "@/lib/blog/authors";
import { getPostsByAuthor } from "@/lib/blog/posts";

type BlogAuthorPageContentProps = {
  authorSlug: string;
};

export function BlogAuthorPageContent({ authorSlug }: BlogAuthorPageContentProps) {
  const author = getBlogAuthor(authorSlug);
  const posts = getPostsByAuthor(authorSlug);

  if (!author) {
    return null;
  }

  return (
    <main className="landing-theme">
      <section className="landing-section border-b">
        <div className={pageContainerClass}>
          <Link
            className="landing-muted text-sm font-medium transition hover:text-sand"
            href="/blog"
          >
            ← Back to Blog
          </Link>

          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <div className="flex items-start gap-5">
                <span className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-beige/10 bg-night-elevated">
                  <img
                    alt={`${author.name} profile photo`}
                    className="h-full w-full object-cover"
                    decoding="async"
                    src={author.avatarImage}
                  />
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand">
                    Author
                  </p>
                  <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-beige md:text-5xl">
                    {author.name}
                  </h1>
                  <p className="mt-3 text-base font-medium text-sand">
                    {author.credentials}
                  </p>
                </div>
              </div>

              <p className="mt-8 max-w-3xl text-base leading-8 text-beige md:text-lg md:leading-9">
                {author.bio}
              </p>

              <section className="mt-14">
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-beige">
                  Articles by {author.name}
                </h2>

                <div className="mt-8 space-y-12">
                  {posts.map((post) => (
                    <article
                      className="border-b border-beige/10 pb-12 last:border-b-0 last:pb-0"
                      key={post.slug}
                    >
                      <p className="max-w-3xl text-base leading-8 text-beige">
                        {post.excerpt}
                      </p>

                      <Link
                        className="mt-6 inline-flex rounded-full border border-sand/40 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-sand transition hover:border-sand hover:bg-sand/10 hover:text-beige"
                        href={`/blog/${post.slug}`}
                      >
                        Continue reading…
                      </Link>

                      <Link
                        className="mt-8 block overflow-hidden rounded-[1.75rem] landing-border border"
                        href={`/blog/${post.slug}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={post.imageAlt}
                          className="aspect-[16/9] w-full object-cover transition duration-700 hover:scale-[1.02]"
                          decoding="async"
                          src={post.image}
                        />
                      </Link>

                      <h3 className="mt-8 text-2xl font-bold tracking-[-0.04em] text-beige">
                        <Link
                          className="transition hover:text-sand"
                          href={`/blog/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>

                      <div className="mt-5">
                        <BlogAuthorByline author={author} post={post} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <BlogSidebar />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
