import type { Site } from "@ab-tester/db";
import type { ErrorBody } from "./http";

/** 404, not 403, for a site the caller doesn't own — doesn't confirm whether a site id
 * that isn't theirs even exists. Shared across every resource nested under
 * `/v1/sites/:siteId/...` (experiments, results) since the response is identical
 * everywhere this check applies. */
export const SITE_NOT_FOUND: { status: 404; body: ErrorBody } = { status: 404, body: { error: "Site not found" } };

/** Takes an already-fetched (possibly missing) site row rather than querying itself, so
 * a caller that needs the row alongside another query can still fetch both in one
 * `Promise.all` round trip instead of adding a second one just for this check. */
export function isOwnedBy(site: Site | undefined, ownerUserId: string): site is Site {
  return site !== undefined && site.ownerUserId === ownerUserId;
}
