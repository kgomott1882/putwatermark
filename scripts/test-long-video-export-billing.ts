import assert from "node:assert/strict";
import {
  calculateLongVideoChunkSurcharge,
  calculateServerVideoCreditCost,
  estimateLongVideoChunkCount,
  formatVideoExportCostNotice,
  LONG_VIDEO_CHUNK_SURCHARGE_CREDITS_PER_EXTRA_CHUNK,
} from "../src/lib/exportCost";
import { LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS } from "../src/lib/videoExportLimits";

assert.equal(LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS, 4 * 60);

assert.equal(estimateLongVideoChunkCount(11 * 60), 3);
assert.equal(estimateLongVideoChunkCount(25 * 60), 7);
assert.equal(estimateLongVideoChunkCount(30 * 60), 8);

assert.deepEqual(calculateLongVideoChunkSurcharge(1), {
  chunkCount: 1,
  extraChunks: 0,
  surcharge: 0,
});
assert.deepEqual(calculateLongVideoChunkSurcharge(4), {
  chunkCount: 4,
  extraChunks: 3,
  surcharge: 3 * LONG_VIDEO_CHUNK_SURCHARGE_CREDITS_PER_EXTRA_CHUNK,
});

const regularServer = calculateServerVideoCreditCost(10 * 60, 200 * 1024 * 1024);
assert.equal(regularServer.longVideoChunkSurcharge, 0);
assert.equal(regularServer.cost, 500 + 1050);

const longServerEstimate = calculateServerVideoCreditCost(
  25 * 60,
  200 * 1024 * 1024,
  estimateLongVideoChunkCount(25 * 60),
);
assert.equal(longServerEstimate.durationBase, 1250);
assert.equal(longServerEstimate.sizeSurcharge, 1050);
assert.equal(longServerEstimate.longVideoExtraChunks, 6);
assert.equal(longServerEstimate.longVideoChunkSurcharge, 600);
assert.equal(longServerEstimate.cost, 2900);

const longServerActual = calculateServerVideoCreditCost(25 * 60, 200 * 1024 * 1024, 5);
assert.equal(longServerActual.longVideoExtraChunks, 4);
assert.equal(longServerActual.longVideoChunkSurcharge, 400);
assert.equal(longServerActual.cost, 2700);

const notice = formatVideoExportCostNotice({
  cost: longServerEstimate.cost,
  durationBase: longServerEstimate.durationBase,
  durationSeconds: 25 * 60,
  fileSizeBytes: 200 * 1024 * 1024,
  longVideoChunkSurcharge: longServerEstimate.longVideoChunkSurcharge,
  longVideoExtraChunks: longServerEstimate.longVideoExtraChunks,
  longVideoSurchargeEstimated: true,
  sizeSurcharge: longServerEstimate.sizeSurcharge,
});

assert.match(notice, /estimated extra chunks × 100/);
assert.match(notice, /= 2900 credits\./);

console.log("Long-video export billing tests passed.");
