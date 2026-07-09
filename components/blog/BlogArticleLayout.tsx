import type { ReactNode } from "react";
import { BlogSidebar } from "./BlogSidebar";
import { pageContainerClass } from "../pageContainer";

type BlogArticleLayoutProps = {
  children: ReactNode;
  excludeSlug?: string;
};

export function BlogArticleLayout({
  children,
  excludeSlug,
}: BlogArticleLayoutProps) {
  return (
    <div className={`${pageContainerClass} pb-16 md:pb-24`}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">{children}</div>
        <BlogSidebar excludeSlug={excludeSlug} />
      </div>
    </div>
  );
}
