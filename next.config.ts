import type { NextConfig } from "next";
import { ffmpegAssetIsolationHeaders } from "./src/lib/ffmpegCrossOriginIsolation";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  async headers() {
    return [
      {
        source: "/ffmpeg/:path*",
        headers: [
          ...ffmpegAssetIsolationHeaders,
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
