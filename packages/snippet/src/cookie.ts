const VISITOR_ID_COOKIE = "_abtester_vid";
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * The visitor identifier lives in a first-party cookie, generated once and reused on
 * every later page load so the same visitor keeps landing in the same bucket. A native
 * `crypto.randomUUID()` (v4), not the v7 used elsewhere in this system for D1 surrogate
 * keys — v7's time-ordering exists to help index locality on a server-side primary key,
 * which is irrelevant to a value that's never stored in a database at all, and pulling
 * in a v7 polyfill isn't something this script's byte budget can absorb for a property
 * it doesn't need.
 */
export function getVisitorId(): string {
  const existing = readCookie(VISITOR_ID_COOKIE);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  writeCookie(VISITOR_ID_COOKIE, id, COOKIE_MAX_AGE_DAYS);
  return id;
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeDays: number): void {
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  // `Secure` only makes sense to send over https — browsers ignore it either way on a
  // plain http page, but there's no reason to send a flag that can't apply.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}
