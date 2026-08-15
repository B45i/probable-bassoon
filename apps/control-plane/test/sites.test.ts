import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../src/app";

const jsonHeaders = { "content-type": "application/json" };

interface SiteResponse {
  id: string;
  name: string;
  apiKey: string;
  ownerUserId: string;
}

async function signupAndLogin(email: string) {
  const credentials = { email, password: "correct-horse-battery" };
  await app.request("/v1/auth/signup", { method: "POST", headers: jsonHeaders, body: JSON.stringify(credentials) }, env);
  const res = await app.request(
    "/v1/auth/login",
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(credentials) },
    env,
  );
  const { token } = await res.json<{ token: string }>();
  return { authorization: `Bearer ${token}` };
}

describe("POST /v1/sites", () => {
  it("requires a bearer token", async () => {
    const res = await app.request(
      "/v1/sites",
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "example.com" }) },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("creates a site owned by the authenticated user, with a public site key", async () => {
    const auth = await signupAndLogin("owner@example.com");
    const res = await app.request(
      "/v1/sites",
      { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify({ name: "example.com" }) },
      env,
    );
    expect(res.status).toBe(201);
    const site = await res.json<SiteResponse>();
    expect(site).toMatchObject({ name: "example.com" });
    expect(site.apiKey).toMatch(/^site_[0-9a-f]{48}$/);
  });
});

describe("GET /v1/sites", () => {
  it("only lists the authenticated user's own sites", async () => {
    const alice = await signupAndLogin("alice@example.com");
    const bob = await signupAndLogin("bob@example.com");

    await app.request(
      "/v1/sites",
      { method: "POST", headers: { ...jsonHeaders, ...alice }, body: JSON.stringify({ name: "alice.example" }) },
      env,
    );
    await app.request(
      "/v1/sites",
      { method: "POST", headers: { ...jsonHeaders, ...bob }, body: JSON.stringify({ name: "bob.example" }) },
      env,
    );

    const aliceSites = await (await app.request("/v1/sites", { headers: alice }, env)).json<SiteResponse[]>();
    const bobSites = await (await app.request("/v1/sites", { headers: bob }, env)).json<SiteResponse[]>();

    expect(aliceSites).toHaveLength(1);
    expect(aliceSites[0]).toMatchObject({ name: "alice.example" });
    expect(bobSites).toHaveLength(1);
    expect(bobSites[0]).toMatchObject({ name: "bob.example" });
  });
});
