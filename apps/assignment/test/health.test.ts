import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("GET /snippet.js", () => {
  it("serves the built snippet with cache headers, not JSON", async () => {
    const res = await app.request("/snippet.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate");

    const body = await res.text();
    // The build's globalName — proof this is the real bundle, not a stub string.
    expect(body).toContain("ABTester");
    expect(body).toContain("sendBeacon");
  });
});

describe("GET /openapi.json", () => {
  it("generates without error", async () => {
    // Regression check: routes/assign is mounted under a real base ("/v1"), not "/" — a
    // sub-app mounted at "/" would have its `use("*", attachKv)` middleware match every
    // path in the whole app, including this one, and this request would 500 trying to
    // read a KV binding that middleware never actually attached for it.
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = await res.json<{ paths: Record<string, unknown> }>();
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/health", "/v1/assign"]));
  });
});
