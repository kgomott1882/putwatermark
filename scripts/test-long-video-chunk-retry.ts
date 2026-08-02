import assert from "node:assert/strict";
import {
  formatLongVideoChunkFailureMessage,
  getLongVideoChunkRetryDelayMs,
  isRetryableLongVideoChunkHttpStatus,
  isRetryableLongVideoChunkTransportError,
  LONG_VIDEO_CHUNK_MAX_ATTEMPTS,
  LONG_VIDEO_CHUNK_RETRY_BASE_DELAY_MS,
  sleepMs,
} from "../src/lib/longVideoChunkRetry";
import { VideoExportTimeoutError } from "../src/lib/watermarkVideoExport";

assert.equal(LONG_VIDEO_CHUNK_MAX_ATTEMPTS, 3);
assert.equal(getLongVideoChunkRetryDelayMs(0), LONG_VIDEO_CHUNK_RETRY_BASE_DELAY_MS);
assert.equal(getLongVideoChunkRetryDelayMs(1), LONG_VIDEO_CHUNK_RETRY_BASE_DELAY_MS * 2);

assert.match(
  formatLongVideoChunkFailureMessage(2, 8, "ffmpeg exited 1"),
  /segment 3 of 8.*after 3 attempts.*ffmpeg exited 1/s,
);

assert.match(
  formatLongVideoChunkFailureMessage(0, 15),
  /segment 1 of 15.*contact support.*segment 1 of 15/,
);

assert.equal(isRetryableLongVideoChunkHttpStatus(500), true);
assert.equal(isRetryableLongVideoChunkHttpStatus(429), true);
assert.equal(isRetryableLongVideoChunkHttpStatus(400), false);

assert.equal(
  isRetryableLongVideoChunkTransportError(new VideoExportTimeoutError()),
  true,
);
assert.equal(isRetryableLongVideoChunkTransportError(new TypeError("Failed to fetch")), true);
assert.equal(isRetryableLongVideoChunkTransportError(new Error("nope")), false);

async function simulateChunkRetryRecovery() {
  let calls = 0;

  for (let attempt = 0; attempt < LONG_VIDEO_CHUNK_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await sleepMs(getLongVideoChunkRetryDelayMs(attempt - 1));
    }

    calls += 1;

    if (calls < 3) {
      if (!isRetryableLongVideoChunkHttpStatus(503)) {
        throw new Error("Expected 503 to be retryable.");
      }
      continue;
    }

    return calls;
  }

  throw new Error("Chunk never recovered.");
}

assert.equal(await simulateChunkRetryRecovery(), 3);

console.log("Long-video chunk retry tests passed.");
