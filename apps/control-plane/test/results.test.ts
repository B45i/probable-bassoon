import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { EVENTS_ROUTES, experimentResultsRoute, experimentStatusRoute, experimentsRoute } from "../src/routes/paths";
import type { ExperimentResponse } from "../src/routes/experiments/schemas";
import type { ResultsResponse } from "../src/routes/results/schemas";
import { createSite, jsonHeaders, signupAndLogin } from "./helpers";

function experimentBody(key: string, weights: [number, number] = [5000, 5000]) {
  return {
    key,
    trafficBp: 10000,
    variants: [
      { key: "control", weightBp: weights[0], isControl: true, content: {} },
      { key: "b", weightBp: weights[1], isControl: false, content: {} },
    ],
  };
}

async function createRunningExperiment(auth: { authorization: string }, siteId: string, key: string, weights?: [number, number]) {
  const created = await app.request(
    experimentsRoute(siteId),
    { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify(experimentBody(key, weights)) },
    env,
  );
  const experiment = await created.json<ExperimentResponse>();
  await app.request(
    experimentStatusRoute(siteId, key),
    { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify({ status: "running" }) },
    env,
  );
  return experiment;
}

async function exposeVisitor(siteKey: string, experiment: string, variant: string, visitorId: string) {
  await app.request(
    `${EVENTS_ROUTES.exposure}?site_key=${siteKey}`,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: visitorId, experiment, variant }) },
    env,
  );
}

async function convertVisitor(siteKey: string, visitorId: string, goal: string) {
  await app.request(
    `${EVENTS_ROUTES.conversion}?site_key=${siteKey}`,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: visitorId, goal }) },
    env,
  );
}

function getResults(auth: { authorization: string }, siteId: string, key: string, goal = "signup") {
  return app.request(`${experimentResultsRoute(siteId, key)}?goal=${goal}`, { headers: { ...auth } }, env);
}

describe("GET /v1/sites/:siteId/experiments/:key/results", () => {
  it("requires a bearer token", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "auth_check");

    const res = await app.request(`${experimentResultsRoute(site.id, "auth_check")}?goal=signup`, {}, env);
    expect(res.status).toBe(401);
  });

  it("404s for a site the caller doesn't own", async () => {
    const owner = await signupAndLogin();
    const attacker = await signupAndLogin();
    const site = await createSite(owner);
    await createRunningExperiment(owner, site.id, "owner_check");

    const res = await getResults(attacker, site.id, "owner_check");
    expect(res.status).toBe(404);
  });

  it("404s for an experiment that doesn't exist", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);

    const res = await getResults(auth, site.id, "nonexistent");
    expect(res.status).toBe(404);
  });

  it("400s when the goal query param is missing", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "goal_check");

    const res = await app.request(experimentResultsRoute(site.id, "goal_check"), { headers: { ...auth } }, env);
    expect(res.status).toBe(400);
  });

  it("aggregates exposures and conversions per variant, and leaves control's lift/pValue null", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "aggregate_check");

    // 3 exposed to control, 2 convert; 3 exposed to b, 0 convert.
    for (const visitor of ["c1", "c2", "c3"]) {
      await exposeVisitor(site.apiKey, "aggregate_check", "control", visitor);
    }
    for (const visitor of ["b1", "b2", "b3"]) {
      await exposeVisitor(site.apiKey, "aggregate_check", "b", visitor);
    }
    await convertVisitor(site.apiKey, "c1", "signup");
    await convertVisitor(site.apiKey, "c2", "signup");

    const res = await getResults(auth, site.id, "aggregate_check");
    expect(res.status).toBe(200);
    const body = await res.json<ResultsResponse>();

    const control = body.variants.find((v) => v.key === "control");
    const b = body.variants.find((v) => v.key === "b");
    expect(control).toMatchObject({ exposures: 3, conversions: 2, isControl: true, lift: null, pValue: null, significant: null });
    expect(b).toMatchObject({ exposures: 3, conversions: 0, isControl: false });
    expect(b?.pValue).not.toBeNull();
    expect(control?.rate).toBeCloseTo(2 / 3, 9);
  });

  it("does not attribute a conversion that happened before the exposure", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "ordering_check");

    // Converts first, under a *different* goal namespace concern isn't the point here —
    // the same visitor is exposed only after already converting.
    await convertVisitor(site.apiKey, "early-bird", "signup");
    await exposeVisitor(site.apiKey, "ordering_check", "control", "early-bird");

    const res = await getResults(auth, site.id, "ordering_check");
    const body = await res.json<ResultsResponse>();
    const control = body.variants.find((v) => v.key === "control");
    expect(control).toMatchObject({ exposures: 1, conversions: 0 });
  });

  it("only counts conversions for the requested goal", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "goal_scope_check");

    await exposeVisitor(site.apiKey, "goal_scope_check", "control", "v1");
    await convertVisitor(site.apiKey, "v1", "newsletter");

    const res = await getResults(auth, site.id, "goal_scope_check", "signup");
    const body = await res.json<ResultsResponse>();
    expect(body.variants.find((v) => v.key === "control")).toMatchObject({ conversions: 0 });
  });

  it("does not flag SRM when exposures roughly match the configured split", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "srm_ok", [5000, 5000]);

    for (let i = 0; i < 50; i++) await exposeVisitor(site.apiKey, "srm_ok", "control", `c${i}`);
    for (let i = 0; i < 50; i++) await exposeVisitor(site.apiKey, "srm_ok", "b", `b${i}`);

    const res = await getResults(auth, site.id, "srm_ok");
    const body = await res.json<ResultsResponse>();
    expect(body.srm.detected).toBe(false);
  });

  it("flags SRM when exposures are lopsided against the configured split", async () => {
    const auth = await signupAndLogin();
    const site = await createSite(auth);
    await createRunningExperiment(auth, site.id, "srm_bad", [5000, 5000]);

    for (let i = 0; i < 80; i++) await exposeVisitor(site.apiKey, "srm_bad", "control", `c${i}`);
    for (let i = 0; i < 20; i++) await exposeVisitor(site.apiKey, "srm_bad", "b", `b${i}`);

    const res = await getResults(auth, site.id, "srm_bad");
    const body = await res.json<ResultsResponse>();
    expect(body.srm.detected).toBe(true);
  });
});
