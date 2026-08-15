import { env } from "cloudflare:workers";
import { sign } from "hono/jwt";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { AUTH_ROUTES } from "../src/routes/paths";
import type { AuthTokenResponse } from "../src/routes/auth/schemas";
import type { ErrorBody } from "../src/lib/http";

const jsonHeaders = { "content-type": "application/json" };

// vitest-pool-workers isolates storage per test *file*, not per `it()` — tests in this
// file share one D1 instance, so each test needs its own email rather than a shared
// constant (two tests reusing the same address would collide on the second one).
function makeCredentials() {
  return { email: `${crypto.randomUUID()}@example.com`, password: "correct-horse-battery" };
}

async function signup(body: Record<string, unknown>) {
  return app.request(AUTH_ROUTES.signup, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }, env);
}

async function login(body: Record<string, unknown>) {
  return app.request(AUTH_ROUTES.login, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }, env);
}

describe("POST /v1/auth/signup", () => {
  it("creates a user and never returns the password", async () => {
    const credentials = makeCredentials();
    const res = await signup(credentials);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ email: credentials.email });
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate email", async () => {
    const credentials = makeCredentials();
    expect((await signup(credentials)).status).toBe(201);
    const second = await signup(credentials);
    expect(second.status).toBe(409);
  });

  it("rejects an invalid email or short password", async () => {
    expect((await signup({ email: "not-an-email", password: "whatever123" })).status).toBe(400);
    expect((await signup({ email: "a@example.com", password: "short" })).status).toBe(400);
  });
});

describe("POST /v1/auth/login", () => {
  it("returns a signed JWT for correct credentials", async () => {
    const credentials = makeCredentials();
    await signup(credentials);
    const res = await login(credentials);
    expect(res.status).toBe(200);
    const body = await res.json<AuthTokenResponse>();
    // header.payload.signature — not just "some string", it's an actual JWT.
    expect(body.token.split(".")).toHaveLength(3);
  });

  it("rejects a wrong password without revealing whether the email exists", async () => {
    const credentials = makeCredentials();
    await signup(credentials);
    const wrongPassword = await login({ ...credentials, password: "not-the-password" });
    const unknownEmail = await login({ email: "nobody@example.com", password: "whatever123" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json<ErrorBody>()).toEqual(await unknownEmail.json<ErrorBody>());
  });
});

describe("GET /v1/auth/me", () => {
  it("requires a bearer token", async () => {
    const res = await app.request(AUTH_ROUTES.me, {}, env);
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user, decoded from the token with no D1 read", async () => {
    const credentials = makeCredentials();
    await signup(credentials);
    const { token } = await (await login(credentials)).json<AuthTokenResponse>();
    const res = await app.request(AUTH_ROUTES.me, { headers: { authorization: `Bearer ${token}` } }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: credentials.email });
  });

  it("rejects a garbage token", async () => {
    const res = await app.request(AUTH_ROUTES.me, { headers: { authorization: "Bearer nonsense" } }, env);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    // Simulates a forged token — same shape, different key. Confirms verification is
    // actually checking the signature, not just parsing the payload.
    const forged = await sign(
      { sub: "someone", email: "x@example.com", createdAt: new Date().toISOString(), exp: Math.floor(Date.now() / 1000) + 3600 },
      "wrong-secret",
    );
    const res = await app.request(AUTH_ROUTES.me, { headers: { authorization: `Bearer ${forged}` } }, env);
    expect(res.status).toBe(401);
  });
});
