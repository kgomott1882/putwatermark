import { concatLongVideoExportJob } from "../src/lib/serverVideoExportRoute";

const jobId = process.argv[2];
const userId = process.argv[3];

if (!jobId || !userId) {
  throw new Error("Usage: npx tsx --env-file=.env.local scripts/long-video-concat-only.ts <jobId> <userId>");
}

const result = await concatLongVideoExportJob(jobId, userId);
console.log(JSON.stringify(result, null, 2));
