import { sign, verify } from "hono/jwt";

/**
 * Admin auth is a stateless JWT: the token is self-describing (user id, email, account
 * creation date, expiry), verified by signature alone. No sessions table, no D1 or KV
 * lookup on the request path — deliberately, since nothing in this system needs to
 * revoke a token before it expires; the cost of that choice is that there's no
 * server-side logout (a client can forget its own token, but a copied one stays valid
 * until it expires).
 */

// Long enough that an admin isn't constantly re-logging in, short enough to bound how
// long a leaked token stays valid given there's no way to revoke one early.
export const JWT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthTokenPayload {
  [key: string]: unknown; // required to structurally satisfy hono/jwt's JWTPayload
  sub: string; // user id
  email: string;
  createdAt: string; // ISO — embedded so /me never has to read D1
  exp: number;
}

function isAuthTokenPayload(payload: unknown): payload is AuthTokenPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.sub === "string" && typeof p.email === "string" && typeof p.createdAt === "string";
}

export async function signAuthToken(
  user: { id: string; email: string; createdAt: Date },
  secret: string,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + JWT_TTL_SECONDS * 1000);
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const token = await sign(payload, secret, "HS256");
  return { token, expiresAt };
}

/** Throws on a missing/invalid/expired/mis-signed token — hono/jwt's `verify` checks the
 * signature and `exp` itself; the shape check here only guards against a token that
 * verifies but was never one of ours (shouldn't happen, since we control every issuer,
 * but cheap to check and turns a confusing downstream error into a clean 401). */
export async function verifyAuthToken(token: string, secret: string): Promise<AuthTokenPayload> {
  const payload = await verify(token, secret, "HS256");
  if (!isAuthTokenPayload(payload)) {
    throw new Error("Token verified but missing expected claims");
  }
  return payload;
}
