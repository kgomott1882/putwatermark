import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Geist, Geist_Mono } from "next/font/google";
import { CursorFollower } from "../../components/landing/CursorFollower";
import { SiteNav } from "../../components/SiteNav";
import { SmoothScrollProvider } from "../../components/SmoothScrollProvider";
import { getSiteUrl } from "../lib/siteUrl";
import "./globals.css";

export const viewport: Viewport = {
  initialScale: 1,
  viewportFit: "cover",
  width: "device-width",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "PutWatermark: Watermark photos, PDFs & video in your browser",
  description:
    "Watermark photos, PDFs, and videos in your browser. Batch export, sign & fill PDFs, trim and blur video, merge and compress PDFs. No subscription, pay as you go.",
  openGraph: {
    title: "PutWatermark: Watermark photos, PDFs & video in your browser",
    description:
      "Watermark photos, PDFs, and videos in your browser. Batch export, sign & fill PDFs, trim and blur video, merge and compress PDFs. No subscription, pay as you go.",
  },
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <SmoothScrollProvider>
          <CursorFollower />
          <SiteNav />
          {children}
        </SmoothScrollProvider>
      </body>
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
    </html>
  );
}
