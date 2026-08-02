import type { Metadata } from "next";
import { Suspense } from "react";
import { FeaturesPageClient } from "../../../components/features/FeaturesPageClient";

export const metadata: Metadata = {
  title: "Features | PutWatermark",
  description:
    "Text and logo watermarks, batch photo export, sign & fill PDFs, video editing (trim, blur, merge, captions), and PDF merge & compress — all in your browser.",
  openGraph: {
    title: "Features | PutWatermark",
    description:
      "Text and logo watermarks, batch photo export, sign & fill PDFs, video editing (trim, blur, merge, captions), and PDF merge & compress — all in your browser.",
  },
};

export default function FeaturesPage() {
  return (
    <Suspense fallback={null}>
      <FeaturesPageClient />
    </Suspense>
  );
}
