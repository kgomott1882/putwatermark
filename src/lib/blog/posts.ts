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
    dateModified: "2026-07-15",
    datePublished: "2026-07-15",
    excerpt:
      "Watermark, trim, blur, merge, and caption video in your browser — no software to install. Short clips run locally; longer videos up to 60 minutes are processed on our servers.",
    image: "/Office Meeting.png",
    imageAlt: "Team meeting in an office reviewing video content",
    metaDescription:
      "Watermark, trim, blur, merge, and caption video in your browser — no software to install. Short clips run locally; longer videos up to 60 minutes are processed on our servers.",
    metaTitle: "How to Watermark a Video Online for Free | PutWatermark",
    slug: "how-to-watermark-a-video-online-free",
    tags: ["Video", "Watermarking", "Browser", "Free"],
    title: "How to Watermark a Video Online for Free (No Software Required)",
  },
  {
    authorSlug: "jordan-kim",
    category: "Real Estate",
    categorySlug: "real-estate",
    dateModified: "2026-07-10",
    datePublished: "2026-07-10",
    excerpt:
      "Most real estate agents don't own their listing photos — the photographer does. Here's what that means, when watermarking helps, and when MLS rules forbid it.",
    image: "/Mjita.jpeg",
    imageAlt: "Residential property exterior in a real estate listing photo",
    metaDescription:
      "Most real estate agents don't own their listing photos — the photographer does. Here's what that means, when watermarking helps, and when MLS rules forbid it.",
    metaTitle:
      "Real Estate Photo Copyright: Who Owns Listing Photos? | PutWatermark",
    slug: "real-estate-listing-photo-copyright-watermarking",
    tags: ["Real Estate", "Photos", "Copyright", "MLS", "Watermarking"],
    title: "Who Owns Your Real Estate Listing Photos? (And When You Can Watermark Them)",
  },
  {
    authorSlug: "jordan-kim",
    category: "Watermarking",
    categorySlug: "watermarking",
    dateModified: "2026-07-10",
    datePublished: "2026-07-10",
    excerpt:
      "A single watermark looks cleaner. A tiled watermark is harder to remove. Here's how to choose the right one depending on what you're actually protecting against.",
    image: "/Young_white_male_black_background.jpeg",
    imageAlt: "Portrait photo with a single watermark in the corner",
    metaDescription:
      "A single watermark looks cleaner. A tiled watermark is harder to remove. Here's how to choose the right one depending on what you're actually protecting against.",
    metaTitle:
      "Single vs. Tiled Watermarks: Which Protects Your Photos? | PutWatermark",
    slug: "single-vs-tiled-watermarks",
    tags: ["Photos", "Watermarking", "Tile", "Protection"],
    title: "Single vs. Tiled Watermarks: Which One Actually Protects Your Photos?",
  },
  {
    authorSlug: "jordan-kim",
    category: "Comparisons",
    categorySlug: "comparisons",
    dateModified: "2026-07-10",
    datePublished: "2026-07-10",
    excerpt:
      "A structural comparison of PutWatermark against Watermark.ws, Visual Watermark, and Watermarkly — platform, pricing model, and file support, without relying on numbers that go out of date.",
    image: "/Compare.png",
    imageAlt: "Comparison of watermarking tools side by side",
    metaDescription:
      "A structural comparison of PutWatermark against Watermark.ws, Visual Watermark, and Watermarkly — platform, pricing model, and file support, without relying on numbers that go out of date.",
    metaTitle:
      "PutWatermark vs. Watermark.ws vs. Visual Watermark vs. Watermarkly | Comparison",
    slug: "putwatermark-vs-watermark-ws-visual-watermark-watermarkly",
    tags: ["Comparisons", "Watermarking", "Photos", "PDF", "Video"],
    title:
      "PutWatermark vs. Watermark.ws vs. Visual Watermark vs. Watermarkly: How the Options Compare",
  },
  {
    authorSlug: "jordan-kim",
    category: "Watermarking",
    categorySlug: "watermarking",
    dateModified: "2026-07-09",
    datePublished: "2026-07-09",
    excerpt:
      "Watermark dozens of photos in one pass instead of one at a time. Upload multiple images, apply one watermark, and export them all as a ZIP — free, in your browser.",
    image: "/Grid_collage_humans.jpg",
    imageAlt: "Grid collage of portrait photos",
    metaDescription:
      "Watermark dozens of photos in one pass instead of one at a time. Upload multiple images, apply one watermark, and export them all as a ZIP — free, in your browser.",
    metaTitle:
      "How to Batch Watermark Multiple Photos at Once (Free) | PutWatermark",
    slug: "how-to-batch-watermark-multiple-photos",
    tags: ["Photos", "Batch", "Watermarking", "ZIP"],
    title: "How to Batch Watermark Multiple Photos at Once (Free)",
  },
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
      "Draw or type your signature, add fill-in text where needed, place everything on any page, and download — no printer, no account, no software install.",
    image: "/Tablet_signing.jpeg",
    imageAlt: "Person signing and filling a document on a tablet",
    metaDescription:
      "Sign and fill a PDF online in seconds — draw or type your signature, add fill-in text fields, place them anywhere on the document, and download. No software, no account, no subscription.",
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
      "No signup is required to try the editor — upload, watermark, and preview freely. Create a free account when you're ready to export; your draft is saved for 48 hours if you sign up mid-session.",
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
  "Signing a PDF online means adding your signature — drawn by hand, typed, or uploaded as an image — directly onto a digital document, without printing it, signing it on paper, and scanning it back in. PutWatermark's Sign & Fill tool also lets you place fill-in text fields on specific pages. Electronic signatures created this way are legally valid for most everyday agreements in the United States under the ESIGN Act and UETA. Exporting signed or filled PDF pages uses 50 credits per billable page, with an additional 5-credit surcharge per page that contains fill text. Try the editor in your browser with no account required.";

export const signPdfFaqSchema = [
  {
    question: "Do I need to create an account to sign a PDF?",
    answer:
      "No signup is required to try the editor — upload, create your signature, and preview freely. Exporting signed or filled PDF pages uses credits (50 per billable page, plus 5 per fill-text page). Create a free account when you're ready to export.",
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
    question: "Can I add fill-in text fields to a PDF?",
    answer:
      "Yes. Use Add Text in the Sign & Fill tool to place typed fields on specific pages. Each page with fill text costs 55 credits total (50 for the page plus a 5-credit fill surcharge). Pages with signatures or initials only cost 50 credits per page.",
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
    name: "Add fill-text fields (optional)",
    text: "Use Add Text to place typed fields on pages that need them. Fill-text pages use additional export credits.",
  },
  {
    name: "Download your signed PDF",
    text: "Export the document with your signatures, initials, and fill-text fields applied.",
  },
] as const;

export const BATCH_WATERMARK_OPENING_DEFINITION =
  "Batch watermarking means applying the same watermark to a group of photos at once, instead of opening and editing each image individually. Upload several photos, set up your watermark a single time, and export the whole set together — typically as a ZIP file. PutWatermark supports this for free, directly in your browser.";

export const batchWatermarkFaqSchema = [
  {
    question: "How many photos can I batch watermark at once?",
    answer:
      "There's no fixed cap in the tool itself. Batches are limited practically by your device's available memory, since everything processes in your browser rather than on a server.",
  },
  {
    question: "Can I use a different watermark for some photos in the batch?",
    answer:
      "Not within a single batch. All photos share the same watermark configuration. For different watermarks, export them as separate batches.",
  },
  {
    question: "Do I need an account to batch watermark photos?",
    answer:
      "No signup is required to try batch watermarking — upload photos, set up your mark, and preview freely. Create a free account when you're ready to export the ZIP.",
  },
  {
    question: "What file do I get after exporting a batch?",
    answer:
      "A single ZIP file containing every photo from the batch, each individually watermarked, with filenames based on the originals.",
  },
  {
    question: "Can I batch watermark videos or PDFs the same way?",
    answer:
      "Not currently. Batch export applies to photos. Videos and PDFs are watermarked and exported individually.",
  },
  {
    question: "Does batch watermarking cost more than watermarking one photo?",
    answer:
      "No. The cost is calculated per photo the same way whether it's exported alone or as part of a batch.",
  },
] as const;

export const batchWatermarkHowToSchema = [
  {
    name: "Upload multiple photos",
    text: "Select or drag several images into the tool together.",
  },
  {
    name: "Review the batch",
    text: "Preview each photo via the thumbnail strip before committing to settings.",
  },
  {
    name: "Set up your watermark once",
    text: "Choose text or a logo, position, opacity, and size — applies to every photo in the batch.",
  },
  {
    name: "Check across different photos",
    text: "Confirm placement looks right on both portrait and landscape images if the set is mixed.",
  },
  {
    name: "Export the batch",
    text: "Download all watermarked photos together as a single ZIP file.",
  },
] as const;

export const REAL_ESTATE_PHOTO_OPENING_DEFINITION =
  "Under U.S. copyright law, the photographer who takes a real estate listing photo owns the copyright by default — not the homeowner, and not the listing agent — unless there's a written agreement that transfers or licenses those rights. What agents and brokers typically have is a license to use the photos for a specific purpose, usually marketing the property while it's actively listed, not permanent ownership.";

export const realEstatePhotoFaqSchema = [
  {
    question: "Do real estate agents own their listing photos?",
    answer:
      "Usually not automatically. The photographer owns the copyright by default unless a written agreement transfers or licenses those rights to the agent or brokerage — and most agreements grant a license for a specific purpose, not full ownership.",
  },
  {
    question: "Can I watermark photos before submitting them to the MLS?",
    answer:
      "Check your specific MLS's rules first — many prohibit watermarks, logos, or branding on submitted listing photos. Watermarking is generally more appropriate for a photographer's own portfolio, proofs, or marketing materials used outside the MLS feed itself.",
  },
  {
    question: "What happens if I reuse a photo after a listing expires?",
    answer:
      "If the photo's license was limited to the active listing period, continuing to use it afterward — including on a relisting with a new agent — can require new permission from the photographer, regardless of who originally paid for the shoot.",
  },
  {
    question: "Can I batch watermark all the photos from a property shoot at once?",
    answer:
      "Yes — upload the full set and apply one watermark setup across all of them, then export as a ZIP.",
  },
  {
    question: "Can I sign real estate documents in the same tool?",
    answer:
      "Yes — use Sign & Fill to draw or type a signature, add initials, or place fill-in text fields on a PDF in the same editor you use for watermarking photos.",
  },
] as const;

export const SINGLE_VS_TILED_OPENING_DEFINITION =
  "A single watermark places one instance of your mark — text, a logo, or a signature — in a specific spot on an image, typically a corner. A tiled watermark repeats that same mark in a pattern across the entire image. Both protect a photo from unauthorized use, but they trade off differently between looking professional and being difficult to remove.";

export const WATERMARK_VIDEO_OPENING_DEFINITION =
  "Watermarking a video means overlaying text, a logo, or a signature onto the footage to indicate ownership or prevent unauthorized use, the same way you'd watermark a photo. PutWatermark lets you do this directly in your browser, for free, without installing video editing software — short clips process locally, and most larger videos are handled automatically on our servers.";

export const watermarkVideoFaqSchema = [
  {
    question: "Is there a size or length limit on watermarking video?",
    answer:
      "Short clips process instantly in your browser. Most larger videos are processed automatically on our servers; very large files may need to be split for now.",
  },
  {
    question: "Do I need an account to watermark a video?",
    answer:
      "No. Uploading a video, designing a watermark, and exporting a short clip all work without an account. An account and credits are only needed for videos that fall outside the always-free client-side range.",
  },
  {
    question: "Can I use a tiled watermark on video, not just photos?",
    answer:
      "Yes. Density, angle, gap, and opacity all work the same way on video as they do on photos, live over the playing footage.",
  },
  {
    question: "Can I sign a video instead of watermarking it?",
    answer:
      "Yes. The same signature feature used for PDFs and photos can be placed directly onto a video.",
  },
  {
    question: "What video formats are supported?",
    answer: "MP4, MOV, and WebM.",
  },
  {
    question: "Does exporting a longer video mean my file is stored somewhere?",
    answer:
      "Server-processed videos are stored only temporarily for processing, then permanently deleted — typically within minutes, and no later than 24 hours. Nothing is retained long-term.",
  },
] as const;

export const WATERMARK_COMPARISON_OPENING_DEFINITION =
  "Watermark.ws, Visual Watermark, Watermarkly, and PutWatermark all solve the same basic problem — adding a watermark to protect photos, videos, or documents — but they differ in real, structural ways: whether you need to install anything, whether pricing is a recurring subscription or a pay-as-you-go model, and what file types each one actually supports.";

export const watermarkComparisonFaqSchema = [
  {
    question: "Which of these tools is free?",
    answer:
      "All four offer some form of free tier or trial, though the specifics — what's included, and what triggers a paywall — vary and change over time. Check each provider's current pricing page for exact terms.",
  },
  {
    question: "Do any of these require software installation?",
    answer:
      "Visual Watermark is desktop software you download. Watermarkly offers desktop and mobile apps in addition to a browser version. PutWatermark and Watermark.ws are both browser-only, with nothing to install.",
  },
  {
    question: "Can I sign documents with any of these tools?",
    answer:
      "PutWatermark includes Sign & Fill for PDFs — draw or type signatures and initials, add fill-in text fields, and export from the same editor as watermarking. The other three tools in this comparison do not currently offer that workflow.",
  },
  {
    question: "Does switching between these tools require re-learning everything?",
    answer:
      "The core concept is the same across all of them — upload a file, configure a watermark, export it — so the general workflow transfers between tools even though the specific interface and options differ.",
  },
  {
    question: "Is this comparison kept up to date?",
    answer:
      "Pricing and features for competing products can change at any time. This comparison reflects publicly available information as of publishing — always confirm current details on each provider's own site.",
  },
] as const;

export const singleVsTiledFaqSchema = [
  {
    question: "Is a tiled watermark always better protection than a single one?",
    answer:
      "For resistance to cropping, yes — a tiled pattern covers the whole image, so there's no clean section left to isolate. A single watermark is easier to remove but reads as more professional, so the better choice depends on whether protection or presentation matters more for that specific image.",
  },
  {
    question: "Can someone still steal a photo with a tiled watermark on it?",
    answer:
      "Nothing makes an image completely theft-proof — a determined person can still use a heavily tiled image for some purposes, or attempt to edit around the pattern. Tiling raises the effort required significantly; it doesn't make copying impossible.",
  },
  {
    question: "Should I use a tiled watermark on my final delivered photos?",
    answer:
      "Usually not — tiling is best suited to previews, proofs, or content shared before a transaction is finalized. Final, paid-for, or already-public work is typically better served by a single, less intrusive watermark.",
  },
  {
    question: "Can I adjust how dense or visible a tiled watermark is?",
    answer:
      "Yes — density, angle, and opacity can all be adjusted independently, letting you balance how protected an image is against how usable it stays for legitimate viewing.",
  },
  {
    question: "Does this apply to video and PDF watermarks too?",
    answer:
      "Yes — the same single-versus-tiled choice applies whether you're watermarking a photo, a video frame, or a PDF page.",
  },
] as const;
