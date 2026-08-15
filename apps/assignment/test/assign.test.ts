import { env } from "cloudflare:workers";
import { experimentConfigKey, type ExperimentConfig } from "@ab-tester/shared";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { ASSIGN_ROUTE } from "../src/routes/paths";
import type { AssignResponse } from "../src/routes/assign/schemas";

const SITE_KEY = "site_test123";

function config(overrides: Partial<ExperimentConfig> = {}): ExperimentConfig {
  return {
    key: "hero_copy",
    version: 1,
    salt: "fixed-salt",
    status: "running",
    trafficBp: 10000,
    variants: [
      { key: "control", weightBp: 5000, isControl: true, content: { headline: "A" } },
      { key: "b", weightBp: 5000, isControl: false, content: { headline: "B" } },
    ],
    ...overrides,
  };
}

async function seed(siteKey: string, cfg: ExperimentConfig): Promise<void> {
  await env.EXPERIMENT_CONFIG.put(experimentConfigKey(siteKey, cfg.key), JSON.stringify(cfg));
}

function assignUrl(params: Record<string, string>): string {
  return `${ASSIGN_ROUTE}?${new URLSearchParams(params).toString()}`;
}

describe("GET /v1/assign", () => {
  it("omits experiments with no KV entry rather than erroring", async () => {
    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "does_not_exist" }),
      {},
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json<AssignResponse>()).toEqual({ assignments: [] });
  });

  it("returns an assignment for a running experiment at 100% traffic", async () => {
    await seed(SITE_KEY, config({ key: "always_on" }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "always_on" }),
      {},
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json<AssignResponse>();
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0]).toMatchObject({ experiment: "always_on" });
    expect(["control", "b"]).toContain(body.assignments[0]?.variant);
  });

  it("is sticky across repeated requests for the same visitor", async () => {
    await seed(SITE_KEY, config({ key: "sticky_check" }));

    const first = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "same-visitor", experiments: "sticky_check" }),
      {},
      env,
    );
    const second = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "same-visitor", experiments: "sticky_check" }),
      {},
      env,
    );
    expect(await first.json<AssignResponse>()).toEqual(await second.json<AssignResponse>());
  });

  it("returns the assigned variant's content", async () => {
    await seed(
      SITE_KEY,
      config({
        key: "content_check",
        trafficBp: 10000,
        variants: [{ key: "control", weightBp: 10000, isControl: true, content: { headline: "Only variant" } }],
      }),
    );

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "content_check" }),
      {},
      env,
    );
    const body = await res.json<AssignResponse>();
    expect(body.assignments[0]).toMatchObject({ variant: "control", content: { headline: "Only variant" } });
  });

  it("excludes everyone at 0% traffic", async () => {
    await seed(SITE_KEY, config({ key: "zero_traffic", trafficBp: 0 }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "zero_traffic" }),
      {},
      env,
    );
    expect(await res.json<AssignResponse>()).toEqual({ assignments: [] });
  });

  it.each(["draft", "paused", "archived"] as const)("omits a %s experiment", async (status) => {
    await seed(SITE_KEY, config({ key: `not_running_${status}`, status }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: `not_running_${status}` }),
      {},
      env,
    );
    expect(await res.json<AssignResponse>()).toEqual({ assignments: [] });
  });

  it("omits a malformed KV entry without failing the rest of the request", async () => {
    await env.EXPERIMENT_CONFIG.put(experimentConfigKey(SITE_KEY, "broken"), "not json");
    await seed(SITE_KEY, config({ key: "valid_sibling" }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "broken,valid_sibling" }),
      {},
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json<AssignResponse>();
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0]).toMatchObject({ experiment: "valid_sibling" });
  });

  it("resolves multiple requested experiments independently", async () => {
    await seed(SITE_KEY, config({ key: "multi_a" }));
    await seed(SITE_KEY, config({ key: "multi_b" }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "multi_a,multi_b" }),
      {},
      env,
    );
    const body = await res.json<AssignResponse>();
    expect(body.assignments.map((a) => a.experiment).sort()).toEqual(["multi_a", "multi_b"]);
  });

  it("scopes by site key: the same experiment key on a different site is not returned", async () => {
    await seed(SITE_KEY, config({ key: "scoped" }));

    const res = await app.request(
      assignUrl({ site_key: "site_other", visitor_id: "v1", experiments: "scoped" }),
      {},
      env,
    );
    expect(await res.json<AssignResponse>()).toEqual({ assignments: [] });
  });

  it("400s when a required query param is missing", async () => {
    const res = await app.request(assignUrl({ site_key: SITE_KEY, experiments: "x" }), {}, env);
    expect(res.status).toBe(400);
  });

  it("is readable cross-origin (CORS allow-origin header present)", async () => {
    await seed(SITE_KEY, config({ key: "cors_check" }));

    const res = await app.request(
      assignUrl({ site_key: SITE_KEY, visitor_id: "v1", experiments: "cors_check" }),
      { headers: { Origin: "https://customer-site.example" } },
      env,
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
