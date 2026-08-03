import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CursorFollower } from "../../components/landing/CursorFollower";
import { SiteNav } from "../../components/SiteNav";
import { SmoothScrollProvider } from "../../components/SmoothScrollProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PutWatermark: Watermark photos, PDFs & video in your browser",
  description:
    "Watermark photos, PDFs, and videos in your browser. Batch export, sign & fill PDFs, trim and blur video, merge and compress PDFs. No subscription, pay as you go.",
  openGraph: {
    title: "PutWatermark: Watermark photos, PDFs & video in your browser",
    description:
      "Watermark photos, PDFs, and videos in your browser. Batch export, sign & fill PDFs, trim and blur video, merge and compress PDFs. No subscription, pay as you go.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>
          <CursorFollower />
          <SiteNav />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
