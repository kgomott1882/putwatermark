export const FFMPEG_ASSET_CACHE_BUST = "coep-v1";

export const ffmpegAssetIsolationHeaders = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "credentialless",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
] as const;

export function applyFfmpegAssetIsolationHeaders(headers: Headers) {
  for (const { key, value } of ffmpegAssetIsolationHeaders) {
    headers.set(key, value);
  }
}
