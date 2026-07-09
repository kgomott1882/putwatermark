import type { Metadata } from "next";
import { BlogIndexClient } from "../../../components/blog/BlogIndexClient";

export const metadata: Metadata = {
  title: "Blog | PutWatermark",
  description:
    "Guides and tips for watermarking photos, PDFs, and videos online — free, in your browser, no software required.",
};

export default function BlogPage() {
  return <BlogIndexClient />;
}
