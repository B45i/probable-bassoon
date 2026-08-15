import { env } from "cloudflare:workers";
import { conversions, createDb } from "@ab-tester/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { EVENTS_ROUTES } from "../src/routes/paths";
import { jsonHeaders } from "./helpers";

const SITE_KEY = "site_track_test";

function exposureUrl(siteKey = SITE_KEY): string {
  return `${EVENTS_ROUTES.exposure}?site_key=${siteKey}`;
}

function conversionUrl(siteKey = SITE_KEY): string {
  return `${EVENTS_ROUTES.conversion}?site_key=${siteKey}`;
}

async function getExposures(siteKey: string, experiment: string) {
  const id = env.EXPOSURES.idFromName(`${siteKey}:${experiment}`);
  const stub = env.EXPOSURES.get(id);
  return stub.getExposures();
}

describe("POST /v1/events/exposure", () => {
  it("returns 202 with no body", async () => {
    const res = await app.request(
      exposureUrl(),
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ visitor_id: "v1", experiment: "hero_copy", variant: "control" }),
      },
      env,
    );
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("records the exposure in the experiment's Durable Object", async () => {
    const experiment = "recorded_check";
    await app.request(
      exposureUrl(),
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ visitor_id: "visitor-a", experiment, variant: "b" }),
      },
      env,
    );

    const rows = await getExposures(SITE_KEY, experiment);
    expect(rows).toEqual([expect.objectContaining({ visitorId: "visitor-a", variantKey: "b" })]);
  });

  it("first exposure wins: a second exposure for the same visitor doesn't overwrite the variant", async () => {
    const experiment = "dedupe_check";
    const send = (variant: string) =>
      app.request(
        exposureUrl(),
        {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ visitor_id: "sticky-visitor", experiment, variant }),
        },
        env,
      );

    await send("control");
    await send("b"); // should be a no-op

    const rows = await getExposures(SITE_KEY, experiment);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ visitorId: "sticky-visitor", variantKey: "control" });
  });

  it("scopes by site key: different sites get independent objects for the same experiment key", async () => {
    const experiment = "scope_check";
    await app.request(
      exposureUrl("site_a"),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "v1", experiment, variant: "control" }) },
      env,
    );

    const otherSiteRows = await getExposures("site_b", experiment);
    expect(otherSiteRows).toEqual([]);
  });

  it("400s on a malformed body", async () => {
    const res = await app.request(
      exposureUrl(),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "v1" }) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("responds to a CORS preflight request", async () => {
    const res = await app.request(
      exposureUrl(),
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://customer-site.example",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      },
      env,
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("POST /v1/events/conversion", () => {
  it("returns 202 with no body", async () => {
    const res = await app.request(
      conversionUrl(),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "v1", goal: "signup" }) },
      env,
    );
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("records the conversion in D1", async () => {
    const db = createDb(env.DB);
    await app.request(
      conversionUrl(),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "visitor-c", goal: "checkout" }) },
      env,
    );

    const rows = await db
      .select()
      .from(conversions)
      .where(and(eq(conversions.siteKey, SITE_KEY), eq(conversions.visitorId, "visitor-c"), eq(conversions.goalKey, "checkout")));
    expect(rows).toHaveLength(1);
  });

  it("first conversion per goal wins: a repeat conversion doesn't add a row or move the timestamp", async () => {
    const db = createDb(env.DB);
    const send = () =>
      app.request(
        conversionUrl(),
        { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "repeat-visitor", goal: "signup" }) },
        env,
      );

    await send();
    const [first] = await db
      .select()
      .from(conversions)
      .where(and(eq(conversions.siteKey, SITE_KEY), eq(conversions.visitorId, "repeat-visitor"), eq(conversions.goalKey, "signup")));

    await send();
    const rows = await db
      .select()
      .from(conversions)
      .where(and(eq(conversions.siteKey, SITE_KEY), eq(conversions.visitorId, "repeat-visitor"), eq(conversions.goalKey, "signup")));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.firstTs).toEqual(first?.firstTs);
  });

  it("400s on a malformed body", async () => {
    const res = await app.request(
      conversionUrl(),
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ visitor_id: "v1" }) },
      env,
    );
    expect(res.status).toBe(400);
  });
});
