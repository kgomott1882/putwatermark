import type { VideoCaptionLayer } from "./videoCaptions";
import type { TextWatermarkLayer } from "./watermarkLayers";

export type VideoShortenSnapshotEntry = {
  duration: number;
  file: File;
  fileName: string;
  fileSize: number;
  height: number;
  id: string;
  width: number;
};

export type VideoShortenSnapshot = {
  captionLayers: VideoCaptionLayer[];
  entry: VideoShortenSnapshotEntry;
  textLayers: TextWatermarkLayer[];
};

export function cloneVideoShortenSnapshot(
  snapshot: VideoShortenSnapshot,
): VideoShortenSnapshot {
  return {
    captionLayers: snapshot.captionLayers.map((layer) => ({ ...layer })),
    entry: { ...snapshot.entry },
    textLayers: snapshot.textLayers.map((layer) => ({ ...layer })),
  };
}

export function areVideoShortenSnapshotsEqual(
  left: VideoShortenSnapshot | null,
  right: VideoShortenSnapshot | null,
) {
  if (!left || !right) {
    return false;
  }

  return (
    left.entry.file === right.entry.file &&
    left.entry.fileSize === right.entry.fileSize &&
    left.entry.fileName === right.entry.fileName &&
    Math.abs(left.entry.duration - right.entry.duration) < 0.05
  );
}
