import { fromHex, timingSafeEqual, toHex } from "../encoding";

/**
 * Password hashing — deliberately slow: passwords are user-chosen and low-entropy, so
 * resistance to offline brute force matters. PBKDF2 via Web Crypto's `crypto.subtle`
 * because it's natively supported in the Workers runtime; bcrypt/scrypt/Argon2 aren't,
 * and would need a WASM or pure-JS shim for no real benefit at this scale.
 *
 * This is the one place slow hashing belongs in this codebase — everything else
 * auth-related (the JWT in jwt.ts, the site key in routes/sites/handlers.ts) is a
 * high-entropy value generated server-side, not a user secret, so it doesn't need this
 * treatment.
 */

// OWASP 2023 minimum for PBKDF2-HMAC-SHA256 is 600,000, but the real Workers runtime
// (workerd) hard-caps crypto.subtle.deriveBits's PBKDF2 iteration count at 100,000 —
// anything above throws NotSupportedError at request time. Miniflare (used by both
// `wrangler dev` and the vitest-pool-workers test suite) doesn't enforce this cap, so
// 600,000 passed every local check and only failed against a real deploy. 100,000 is
// the highest value this platform actually supports, not a deliberately chosen weaker
// number.
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Stored as `pbkdf2$<iterations>$<salt-hex>$<hash-hex>` — self-describing, so the
 * iteration count can be raised later without invalidating existing hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const [, iterationsStr, saltHex, hashHex] = parts as [string, string, string, string];
  const iterations = Number.parseInt(iterationsStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const candidate = await deriveBits(password, fromHex(saltHex), iterations);
  return timingSafeEqual(candidate, fromHex(hashHex));
}
