/**
 * A fixed pool of workers each loop issuing requests back-to-back until the deadline,
 * rather than firing a fixed batch and waiting — that keeps `concurrency` meaning what
 * it says (this many requests in flight at once) for the whole run, instead of decaying
 * as faster workers finish early.
 */
export interface LoadTestOptions {
  durationMs: number;
  concurrency: number;
  makeRequest: () => Promise<{ ok: boolean }>;
}

export interface LoadTestResult {
  totalRequests: number;
  errors: number;
  durationMs: number;
  rps: number;
  latencyMs: { p50: number; p90: number; p99: number; max: number; mean: number };
}

export async function runLoadTest({ durationMs, concurrency, makeRequest }: LoadTestOptions): Promise<LoadTestResult> {
  const latencies: number[] = [];
  let errors = 0;
  const start = performance.now();
  const deadline = start + durationMs;

  async function worker(): Promise<void> {
    while (performance.now() < deadline) {
      const requestStart = performance.now();
      try {
        const { ok } = await makeRequest();
        if (!ok) errors++;
      } catch {
        errors++;
      }
      latencies.push(performance.now() - requestStart);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const elapsedMs = performance.now() - start;
  latencies.sort((a, b) => a - b);
  // Nearest-rank method: the smallest value at or past the p-th percentile of the
  // sorted sample — simple, standard, and exact enough for a load test's own reporting
  // (not something feeding a stats decision the way packages/shared/stats.ts's numbers do).
  const percentile = (p: number): number => {
    if (latencies.length === 0) return 0;
    const index = Math.min(latencies.length - 1, Math.ceil((p / 100) * latencies.length) - 1);
    return latencies[index]!;
  };

  return {
    totalRequests: latencies.length,
    errors,
    durationMs: elapsedMs,
    rps: (latencies.length / elapsedMs) * 1000,
    latencyMs: {
      p50: percentile(50),
      p90: percentile(90),
      p99: percentile(99),
      max: latencies[latencies.length - 1] ?? 0,
      mean: latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1),
    },
  };
}

export function printResult(label: string, result: LoadTestResult): void {
  const l = result.latencyMs;
  console.log(`\n${label}`);
  console.log(`  requests: ${result.totalRequests}  errors: ${result.errors}  rps: ${result.rps.toFixed(1)}`);
  console.log(
    `  latency (ms) — p50: ${l.p50.toFixed(1)}  p90: ${l.p90.toFixed(1)}  p99: ${l.p99.toFixed(1)}  max: ${l.max.toFixed(1)}  mean: ${l.mean.toFixed(1)}`,
  );
}
