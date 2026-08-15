import { writeFileSync } from "node:fs";

/**
 * Creates a throwaway user, site, and running experiment through the real HTTP API —
 * not a direct D1 write — so the seeded state is exactly what a real signup would
 * produce. Writes the ids the load tests need to `.perf-seed.json` (gitignored) so
 * `assign`/`tracking` don't each re-seed on every run.
 */
const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL ?? "http://localhost:8787";
const EXPERIMENT_KEY = "perf_test";

interface AuthTokenResponse {
  token: string;
}
interface SiteResponse {
  id: string;
  apiKey: string;
}

async function post<T>(path: string, body: unknown, auth?: Record<string, string>): Promise<T> {
  const res = await fetch(`${CONTROL_PLANE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function main(): Promise<void> {
  const email = `perf-${Date.now()}@example.com`;
  const password = "correct-horse-battery-perf";

  await post("/v1/auth/signup", { email, password });
  const { token } = await post<AuthTokenResponse>("/v1/auth/login", { email, password });
  const auth = { authorization: `Bearer ${token}` };

  const site = await post<SiteResponse>("/v1/sites", { name: "perf-test.example" }, auth);

  await post(
    `/v1/sites/${site.id}/experiments`,
    {
      key: EXPERIMENT_KEY,
      trafficBp: 10000,
      variants: [
        { key: "control", weightBp: 5000, isControl: true, content: { headline: "A" } },
        { key: "b", weightBp: 5000, isControl: false, content: { headline: "B" } },
      ],
    },
    auth,
  );
  await post(`/v1/sites/${site.id}/experiments/${EXPERIMENT_KEY}/status`, { status: "running" }, auth);

  const seed = { siteId: site.id, siteKey: site.apiKey, experimentKey: EXPERIMENT_KEY };
  writeFileSync(new URL("../.perf-seed.json", import.meta.url), JSON.stringify(seed, null, 2));
  console.log("Seeded:", seed);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
