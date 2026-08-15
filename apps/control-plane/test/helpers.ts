import { env } from "cloudflare:workers";
import app from "../src/app";
import type { AuthTokenResponse } from "../src/routes/auth/schemas";
import { AUTH_ROUTES, SITES_ROUTES } from "../src/routes/paths";
import type { SiteResponse } from "../src/routes/sites/schemas";

export const jsonHeaders = { "content-type": "application/json" };

export function uniqueEmail(): string {
  return `${crypto.randomUUID()}@example.com`;
}

/** Signs up a fresh user (or the given email) and returns an Authorization header ready
 * to spread into a request's headers. Used by every test suite that needs to act as an
 * authenticated user but isn't itself testing signup/login (auth.test.ts tests those
 * directly and needs finer-grained control, so it doesn't use this). */
export async function signupAndLogin(email: string = uniqueEmail()): Promise<{ authorization: string }> {
  const credentials = { email, password: "correct-horse-battery" };
  await app.request(
    AUTH_ROUTES.signup,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(credentials) },
    env,
  );
  const res = await app.request(
    AUTH_ROUTES.login,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(credentials) },
    env,
  );
  const { token } = await res.json<AuthTokenResponse>();
  return { authorization: `Bearer ${token}` };
}

export async function createSite(auth: { authorization: string }, name = "example.com"): Promise<SiteResponse> {
  const res = await app.request(
    SITES_ROUTES.root,
    { method: "POST", headers: { ...jsonHeaders, ...auth }, body: JSON.stringify({ name }) },
    env,
  );
  return res.json<SiteResponse>();
}
