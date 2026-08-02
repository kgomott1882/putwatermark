export type BlogAuthor = {
  avatarImage: string;
  bio: string;
  credentials: string;
  name: string;
  slug: string;
};

export const blogAuthors: BlogAuthor[] = [
  {
    avatarImage: "/Kim.png",
    bio: "Jordan writes practical guides on watermarking, PDF signing, and protecting creative work in the browser — without desktop software or subscriptions.",
    credentials: "Document workflows & browser-based editing",
    name: "Jordan Kim",
    slug: "jordan-kim",
  },
];

export function getBlogAuthor(slug: string) {
  return blogAuthors.find((author) => author.slug === slug);
}

export function getAuthorInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function buildAuthorJsonLd(author: BlogAuthor) {
  return {
    "@type": "Person",
    jobTitle: author.credentials,
    name: author.name,
    url: `https://putwatermark.com/blog/author/${author.slug}`,
  };
}
