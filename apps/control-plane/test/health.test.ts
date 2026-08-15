import { describe, expect, it } from "vitest";
import app from "../src/app";
import { HEALTH_PATH } from "../src/routes/paths";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request(HEALTH_PATH);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
