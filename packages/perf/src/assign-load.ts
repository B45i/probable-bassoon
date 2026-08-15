import { printResult, runLoadTest } from "./lib/load";
import { readSeed } from "./seed-file";

/**
 * The one hard latency SLA in this system (design doc §2.3: under 10ms at the edge,
 * 150ms hard timeout). Run against a real deployment to mean anything — local
 * `wrangler dev` has no real edge network or KV replication involved, so it can only
 * tell you the code's own CPU cost (hashing, JSON), not whether the SLA actually holds.
 */
const ASSIGN_URL = process.env.ASSIGN_URL ?? "http://localhost:8788";
const DURATION_MS = Number(process.env.DURATION_MS ?? 10_000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 50);

async function main(): Promise<void> {
  const seed = readSeed();

  const result = await runLoadTest({
    durationMs: DURATION_MS,
    concurrency: CONCURRENCY,
    makeRequest: async () => {
      // A fresh visitor_id per request, not a fixed one — real traffic isn't one visitor
      // hammering the endpoint, and this keeps the bucketing hash doing real work each call.
      const visitorId = crypto.randomUUID();
      const query = new URLSearchParams({
        site_key: seed.siteKey,
        visitor_id: visitorId,
        experiments: seed.experimentKey,
      });
      const res = await fetch(`${ASSIGN_URL}/v1/assign?${query.toString()}`);
      return { ok: res.ok };
    },
  });

  printResult(`GET /v1/assign — concurrency=${CONCURRENCY}, duration=${DURATION_MS}ms`, result);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
