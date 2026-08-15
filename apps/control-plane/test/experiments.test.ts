import { env } from "cloudflare:workers";
import { experimentConfigKey, type ExperimentConfig } from "@ab-tester/shared";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { experimentsRoute, experimentStatusRoute } from "../src/routes/paths";
import type { ExperimentResponse } from "../src/routes/experiments/schemas";
import { createSite, jsonHeaders, signupAndLogin } from "./helpers";

function validBody(key = "hero_copy") {
  return {
    key,
    trafficBp: 10000,
    variants: [
      { key: "control", weightBp: 5000, isControl: true, content: { headline: "Welcome" } },
      { key: "b", weightBp: 5000, isControl: false, content: { headline: "Hey there" } },
    ],
  };
}

describe("POST /v1/sites/:siteId/experiments", () => {
  it("requires a bearer token", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    const res = await app.request(
      experimentsRoute(site.id),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify(validBody()) },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("404s for a site the caller doesn't own", async () => {
    const owner = await signupAndLogin();
    const attacker = await signupAndLogin();
    const site = await createSite(owner);

    const res = await app.request(
      experimentsRoute(site.id),
      { method: "POST", headers: { ...jsonHeaders, ...attacker }, body: JSON.stringify(validBody()) },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("creates an experiment in draft status and writes it through to KV", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);

    const res = await app.request(
      experimentsRoute(site.id),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(validBody()) },
      env,
    );
    expect(res.status).toBe(201);
    const experiment = await res.json<ExperimentResponse>();
    expect(experiment).toMatchObject({ siteId: site.id, key: "hero_copy", status: "draft", trafficBp: 10000 });
    expect(experiment.variants).toHaveLength(2);

    const stored = await env.EXPERIMENT_CONFIG.get(experimentConfigKey(site.apiKey, "hero_copy"));
    expect(stored).not.toBeNull();
    const config = JSON.parse(stored as string) as ExperimentConfig;
    expect(config).toMatchObject({ key: "hero_copy", status: "draft", trafficBp: 10000 });
    expect(config.variants).toHaveLength(2);
    // The KV blob carries the hashing salt; the API response doesn't (nothing
    // admin-facing needs it — see routes/experiments/mappers.ts).
    expect(config).toHaveProperty("salt");
    expect(experiment).not.toHaveProperty("salt");
  });

  it("rejects variant weights that don't sum to 10000", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    const body = validBody();
    body.variants[0]!.weightBp = 4000; // now sums to 9000

    const res = await app.request(
      experimentsRoute(site.id),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(body) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a body with no control variant", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    const body = validBody();
    body.variants[0]!.isControl = false;

    const res = await app.request(
      experimentsRoute(site.id),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(body) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate experiment key for the same site", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    const create = () =>
      app.request(
        experimentsRoute(site.id),
        { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(validBody()) },
        env,
      );

    expect((await create()).status).toBe(201);
    expect((await create()).status).toBe(409);
  });
});

describe("POST /v1/sites/:siteId/experiments/:key/status", () => {
  async function createExperiment(auth: { authorization: string }, siteId: string) {
    const res = await app.request(
      experimentsRoute(siteId),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(validBody()) },
      env,
    );
    return res.json<ExperimentResponse>();
  }

  it("requires a bearer token", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createExperiment(auth, site.id);

    const res = await app.request(
      experimentStatusRoute(site.id, "hero_copy"),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ status: "running" }) },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("transitions draft to running and updates KV", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createExperiment(auth, site.id);

    const res = await app.request(
      experimentStatusRoute(site.id, "hero_copy"),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify({ status: "running" }) },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json<ExperimentResponse>()).toMatchObject({ status: "running" });

    const stored = await env.EXPERIMENT_CONFIG.get(experimentConfigKey(site.apiKey, "hero_copy"));
    const config = JSON.parse(stored as string) as ExperimentConfig;
    expect(config.status).toBe("running");
  });

  it("404s for an experiment that doesn't exist", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);

    const res = await app.request(
      experimentStatusRoute(site.id, "nonexistent"),
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify({ status: "running" }) },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("404s for a site the caller doesn't own", async () => {
    const owner = await signupAndLogin();
    const attacker = await signupAndLogin();
    const site = await createSite(owner);
    await createExperiment(owner, site.id);

    const res = await app.request(
      experimentStatusRoute(site.id, "hero_copy"),
      { method: "POST", headers: { ...jsonHeaders, ...attacker }, body: JSON.stringify({ status: "running" }) },
      env,
    );
    expect(res.status).toBe(404);
  });
});
