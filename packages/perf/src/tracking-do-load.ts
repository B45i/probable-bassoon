import { printResult, runLoadTest } from "./lib/load";
import { readSeed } from "./seed-file";

/**
 * Tracking has no latency SLA (design doc §2.3: fire-and-forget) — what's actually worth
 * measuring here is the scalability risk the design doc names explicitly (§D3 "Known
 * hazard"): a Durable Object is internally single-threaded, so one very high-traffic
 * experiment can saturate its own object's write queue independent of overall platform
 * load. Every request below targets the SAME experiment on purpose — this is testing one
 * object's serialized throughput, not spreading load across many objects the way real
 * platform-wide traffic would. Each `visitor_id` must be unique: exposures dedupe on it,
 * so a repeated id after the first request is a free no-op, not a real write, and would
 * make this measure nothing.
 */
const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL ?? "http://localhost:8787";
const DURATION_MS = Number(process.env.DURATION_MS ?? 5_000);
const CONCURRENCY_STEPS = (process.env.CONCURRENCY_STEPS ?? "10,50,100,200")
  .split(",")
  .map((n) => Number(n.trim()));

async function main(): Promise<void> {
  const seed = readSeed();

  for (const concurrency of CONCURRENCY_STEPS) {
    const result = await runLoadTest({
      durationMs: DURATION_MS,
      concurrency,
      makeRequest: async () => {
        const res = await fetch(`${CONTROL_PLANE_URL}/v1/events/exposure?site_key=${seed.siteKey}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            visitor_id: crypto.randomUUID(),
            experiment: seed.experimentKey,
            variant: "control",
          }),
        });
        return { ok: res.ok };
      },
    });

    printResult(`POST /v1/events/exposure (single experiment) — concurrency=${concurrency}`, result);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
