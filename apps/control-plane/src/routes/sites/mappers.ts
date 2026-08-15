import type { Site } from "@ab-tester/db";
import type { SiteResponse } from "./schemas";

/** The one place that decides what a Site exposes over the API — used by both create
 * and list, so a new column on the table doesn't leak just because one of the two
 * call sites forgot to update its hand-picked field list. */
export function toSiteResponse(site: Site): SiteResponse {
  return { id: site.id, name: site.name, apiKey: site.apiKey, ownerUserId: site.ownerUserId };
}
