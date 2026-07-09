import { getBlogAuthor } from "./authors";

export type BlogPost = {
  authorSlug: string;
  category: string;
  categorySlug: string;
  dateModified: string;
  datePublished: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  metaDescription: string;
  metaTitle: string;
  slug: string;
  tags: readonly string[];
  title: string;
};

export const blogPosts: BlogPost[] = [
  {
    authorSlug: "jordan-kim",
    category: "Watermarking",
    categorySlug: "watermarking",
    dateModified: "2026-07-08",
    datePublished: "2026-07-08",
    excerpt:
      "A step-by-step guide to watermarking photos, PDFs, and videos in your browser — text, logo, and signature marks, no software or signup required.",
    image: "/White_man_working.jpeg",
    imageAlt: "Person watermarking files on a desktop computer",
    metaDescription:
      "Learn how to watermark photos, PDFs, and videos online for free. Step-by-step guide covering text, logo, and signature watermarks — no software or signup required.",
    metaTitle:
      "How to Watermark Photos, PDFs & Videos Free (2026 Guide) | PutWatermark",
    slug: "how-to-watermark-photos-pdfs-videos-online-free",
    tags: ["Photos", "PDF", "Video", "Watermarking"],
    title:
      "How to Watermark Photos, PDFs, and Videos Online for Free (2026 Guide)",
  },
  {
    authorSlug: "jordan-kim",
    category: "PDF Editing",
    categorySlug: "pdf-editing",
    dateModified: "2026-07-09",
    datePublished: "2026-07-09",
    excerpt:
      "Draw or type your signature, place it on any page, and download — no printer, no account, no software install.",
    image: "/Tablet_signing.jpeg",
    imageAlt: "Person signing a document on a tablet",
    metaDescription:
      "Sign a PDF online in seconds — draw or type your signature, place it anywhere on the document, and download. No software, no account, no subscription.",
    metaTitle:
      "How to Sign a PDF Online for Free (No Account Needed) | PutWatermark",
    slug: "how-to-sign-a-pdf-online-free",
    tags: ["PDF", "Signatures", "ESIGN"],
    title: "How to Sign a PDF Online for Free (No Account, No Software)",
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRecentBlogPosts(limit = 5) {
  return [...blogPosts]
    .sort(
      (left, right) =>
        new Date(right.datePublished).getTime() -
        new Date(left.datePublished).getTime(),
    )
    .slice(0, limit);
}

export function getFeaturedBlogPost() {
  return getRecentBlogPosts(1)[0];
}

export function getPostsByAuthor(authorSlug: string) {
  return blogPosts.filter((post) => post.authorSlug === authorSlug);
}

export function getPostsByCategory(categorySlug: string) {
  return blogPosts.filter((post) => post.categorySlug === categorySlug);
}

export function getPostsByTag(tag: string) {
  return blogPosts.filter((post) =>
    post.tags.some((entry) => entry.toLowerCase() === tag.toLowerCase()),
  );
}

export function getBlogCategoryCounts() {
  const counts = new Map<string, { label: string; slug: string; count: number }>();

  for (const post of blogPosts) {
    const existing = counts.get(post.categorySlug);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(post.categorySlug, {
      count: 1,
      label: post.category,
      slug: post.categorySlug,
    });
  }

  return [...counts.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function getBlogTagCounts() {
  const counts = new Map<string, number>();

  for (const post of blogPosts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildBlogPostJsonLd(post: BlogPost) {
  const author = getBlogAuthor(post.authorSlug);
  const canonicalUrl = `https://putwatermark.com/blog/${post.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    author: author
      ? {
          "@type": "Person",
          jobTitle: author.credentials,
          name: author.name,
          url: `https://putwatermark.com/blog/author/${author.slug}`,
        }
      : {
          "@type": "Organization",
          name: "PutWatermark",
          url: "https://putwatermark.com",
        },
    dateModified: post.dateModified,
    datePublished: post.datePublished,
    description: post.metaDescription,
    headline: post.title,
    image: `https://putwatermark.com${post.image}`,
    keywords: post.tags.join(", "),
    mainEntityOfPage: {
      "@id": canonicalUrl,
      "@type": "WebPage",
    },
    publisher: {
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: "https://putwatermark.com/Icon.png",
      },
      name: "PutWatermark",
      url: "https://putwatermark.com",
    },
    url: canonicalUrl,
  };
}

export const OPENING_DEFINITION =
  "A watermark is a visible mark — text, a logo, or a signature — overlaid on a photo, video, or PDF to indicate ownership or prevent unauthorized use. PutWatermark lets you add one directly in your browser, for free, without installing software or creating an account.";

export const blogFaqSchema = [
  {
    question: "Do I need to create an account to watermark a file?",
    answer:
      "No. You can upload a file, design your watermark, and export it without signing up. An account is only needed if you want to remove the free preview watermark or use paid features.",
  },
  {
    question: "Does watermarking reduce file quality?",
    answer:
      "No. Photos and videos export at full resolution. PDFs specifically keep their original text selectable and searchable — only the watermark itself is an overlay, not a flattened image.",
  },
  {
    question: "Can I watermark multiple files at once?",
    answer:
      "Yes, for photos. Upload several images, apply one watermark setup, and export them all together as a ZIP file.",
  },
  {
    question:
      "What's the difference between a single watermark and a tiled watermark?",
    answer:
      "A single watermark places one instance of your mark in a chosen position, like a bottom corner. A tiled watermark repeats it in a pattern across the entire file, making it much harder to crop or edit out.",
  },
  {
    question: "Is there a subscription?",
    answer:
      "No. PutWatermark uses pay-as-you-go credits rather than a monthly subscription.",
  },
] as const;

export const howToPhotoSchema = [
  {
    name: "Upload your photo",
    text: "Drag your photo into the tool or select it from your device.",
  },
  {
    name: "Choose text or a logo",
    text: "Type your watermark text or upload a logo image.",
  },
  {
    name: "Position it",
    text: "Use the position grid or drag the watermark anywhere on the image.",
  },
  {
    name: "Adjust opacity and size",
    text: "Set how subtle or bold the watermark should be.",
  },
  {
    name: "Export",
    text: "Download the finished photo at full resolution.",
  },
] as const;

export const SIGN_PDF_OPENING_DEFINITION =
  "Signing a PDF online means adding your signature — drawn by hand, typed, or uploaded as an image — directly onto a digital document, without printing it, signing it on paper, and scanning it back in. Electronic signatures created this way are legally valid for most everyday agreements in the United States under the ESIGN Act and UETA. PutWatermark lets you do this for free, in your browser, with no account required to try it.";

export const signPdfFaqSchema = [
  {
    question: "Do I need to create an account to sign a PDF?",
    answer:
      "No. You can upload a PDF, create your signature, place it, and download the signed document without signing up.",
  },
  {
    question: "Is a typed signature as legally valid as a drawn one?",
    answer:
      "Yes. Under the ESIGN Act and UETA, what makes an electronic signature valid is the signer's intent and consent — not whether it was drawn, typed, or uploaded as an image.",
  },
  {
    question: "Can I sign a document without printing it?",
    answer:
      "Yes. Upload the PDF, sign it directly in the browser, and download the signed version. No printer or scanner needed.",
  },
  {
    question: "Does signing a PDF change the rest of the document?",
    answer:
      "No. Your signature is placed as an overlay in the position you choose. The rest of the document's text stays selectable and searchable, exactly as it was.",
  },
  {
    question: "Can I save my signature for multiple documents?",
    answer:
      "Yes, for the current session. Draw or type your signature once and reuse it across multiple pages or documents without redoing it each time.",
  },
  {
    question: "Is there a subscription to sign documents?",
    answer:
      "No. PutWatermark uses pay-as-you-go credits rather than a monthly subscription.",
  },
] as const;

export const signPdfHowToSchema = [
  {
    name: "Upload your PDF",
    text: "Drag your PDF into the tool or select it from your device.",
  },
  {
    name: "Create your signature",
    text: "Draw it with your mouse or finger, or type your name in a handwriting-style font.",
  },
  {
    name: "Save it for reuse",
    text: "Keep your signature and initials saved separately for the session.",
  },
  {
    name: "Place your signature",
    text: "Drag it into position on the page and resize as needed.",
  },
  {
    name: "Download your signed PDF",
    text: "Export the document with your signature applied.",
  },
] as const;
