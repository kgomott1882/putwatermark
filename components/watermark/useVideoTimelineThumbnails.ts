"use client";

import { useEffect, useState } from "react";
import {
  getTimelineThumbnailCount,
  getTimelineThumbnailTimes,
} from "@/lib/videoTimeline";

export type VideoTimelineThumbnail = {
  dataUrl: string;
  timeSeconds: number;
};

export type VideoTimelineThumbnailStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

const THUMBNAIL_CAPTURE_WIDTH = 120;
const THUMBNAIL_JPEG_QUALITY = 0.72;
const SEEK_TIMEOUT_MS = 2500;

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadeddata" | "seeked",
  timeoutMs: number,
) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      video.removeEventListener(eventName, onEvent);
      reject(new Error(`Timed out waiting for video ${eventName}.`));
    }, timeoutMs);

    const onEvent = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener(eventName, onEvent);
      resolve();
    };

    video.addEventListener(eventName, onEvent);
  });
}

async function captureTimelineThumbnails(
  videoUrl: string,
  durationSeconds: number,
  signal: AbortSignal,
  rangeStartSeconds = 0,
) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  try {
    await waitForVideoEvent(video, "loadeddata", SEEK_TIMEOUT_MS);

    if (signal.aborted) {
      return [];
    }

    const count = getTimelineThumbnailCount(durationSeconds);
    const times = getTimelineThumbnailTimes(durationSeconds, count).map(
      (timeSeconds) => rangeStartSeconds + timeSeconds,
    );
    const aspectRatio =
      video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16;
    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_CAPTURE_WIDTH;
    canvas.height = Math.max(1, Math.round(THUMBNAIL_CAPTURE_WIDTH * aspectRatio));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create thumbnail canvas.");
    }

    const thumbnails: VideoTimelineThumbnail[] = [];
    const maxSeekTime = Math.max(0, rangeStartSeconds + durationSeconds - 0.04);

    for (const timeSeconds of times) {
      if (signal.aborted) {
        return [];
      }

      video.currentTime = Math.min(Math.max(0, timeSeconds), maxSeekTime);
      await waitForVideoEvent(video, "seeked", SEEK_TIMEOUT_MS);

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbnails.push({
        dataUrl: canvas.toDataURL("image/jpeg", THUMBNAIL_JPEG_QUALITY),
        timeSeconds: Math.round(timeSeconds),
      });
    }

    return thumbnails;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export function useVideoTimelineThumbnails(
  videoUrl: string | undefined,
  durationSeconds: number,
  rangeStartSeconds = 0,
  rangeEndSeconds?: number,
) {
  const scopedDuration =
    rangeEndSeconds !== undefined
      ? Math.max(0, rangeEndSeconds - rangeStartSeconds)
      : durationSeconds;
  const effectiveDuration =
    scopedDuration > 0 && rangeEndSeconds !== undefined
      ? scopedDuration
      : durationSeconds;
  const effectiveRangeStart =
    rangeEndSeconds !== undefined ? rangeStartSeconds : 0;

  const [thumbnails, setThumbnails] = useState<VideoTimelineThumbnail[]>([]);
  const [status, setStatus] = useState<VideoTimelineThumbnailStatus>("idle");

  useEffect(() => {
    if (
      !videoUrl ||
      !Number.isFinite(effectiveDuration) ||
      effectiveDuration <= 0
    ) {
      setThumbnails([]);
      setStatus("idle");
      return;
    }

    const abortController = new AbortController();

    setStatus("loading");
    setThumbnails([]);

    void captureTimelineThumbnails(
      videoUrl,
      effectiveDuration,
      abortController.signal,
      effectiveRangeStart,
    )
      .then((nextThumbnails) => {
        if (abortController.signal.aborted) {
          return;
        }

        setThumbnails(nextThumbnails);
        setStatus(nextThumbnails.length > 0 ? "ready" : "error");
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setThumbnails([]);
          setStatus("error");
        }
      });

    return () => {
      abortController.abort();
    };
  }, [effectiveDuration, effectiveRangeStart, rangeEndSeconds, videoUrl]);

  return { status, thumbnails };
}
