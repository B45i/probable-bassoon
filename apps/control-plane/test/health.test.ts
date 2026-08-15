import { describe, expect, it } from "vitest";
import app from "../src/app";
import { DOCS_PATH, HEALTH_PATH } from "../src/routes/paths";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request(HEALTH_PATH);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("GET /docs", () => {
  it("serves a Swagger UI page pointed at the OpenAPI spec", async () => {
    const res = await app.request(DOCS_PATH);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("/openapi.json");
  });
});
