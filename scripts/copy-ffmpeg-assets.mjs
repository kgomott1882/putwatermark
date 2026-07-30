import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ffmpegCoreVersion = "0.12.6";
const publicFfmpegDir = path.join(rootDir, "public", "ffmpeg");

function copyDirectory(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function copyPackageAssets(relativePackagePath, destinationRelativePath) {
  const sourceDir = path.join(rootDir, "node_modules", relativePackagePath);
  const destinationDir = path.join(publicFfmpegDir, destinationRelativePath);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing ffmpeg asset directory: ${sourceDir}`);
  }

  copyDirectory(sourceDir, destinationDir);
}

fs.rmSync(publicFfmpegDir, { recursive: true, force: true });

copyPackageAssets(
  `@ffmpeg/core-mt/dist/esm`,
  path.join("core-mt", ffmpegCoreVersion),
);
copyPackageAssets(`@ffmpeg/core/dist/esm`, path.join("core", ffmpegCoreVersion));
copyPackageAssets(`@ffmpeg/ffmpeg/dist/esm`, "worker");

console.log(
  `[copy-ffmpeg-assets] Copied ffmpeg core ${ffmpegCoreVersion} assets to public/ffmpeg`,
);
