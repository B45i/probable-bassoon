import { sites, type Database, type NewSite } from "@ab-tester/db";
import { eq } from "drizzle-orm";
import { toHex } from "../../lib/encoding";
import { toSiteResponse } from "./mappers";
import type { SiteResponse } from "./schemas";

interface CreateSiteInput {
  db: Database;
  ownerUserId: string;
  name: string;
}

export async function createSite({ db, ownerUserId, name }: CreateSiteInput): Promise<{ status: 201; body: SiteResponse }> {
  // Public, ships in the browser snippet embedded in the customer's page — not a secret,
  // so no hashing here, unlike passwords/the JWT secret. Prefixed the way Stripe-style
  // keys are, so it's recognizable in logs/devtools as what it is.
  const newSite: NewSite = {
    ownerUserId,
    name,
    apiKey: `site_${toHex(crypto.getRandomValues(new Uint8Array(24)))}`,
  };
  const [created] = await db.insert(sites).values(newSite).returning();
  if (!created) {
    throw new Error("Site insert returned no row");
  }

  return { status: 201, body: toSiteResponse(created) };
}

interface ListSitesInput {
  db: Database;
  ownerUserId: string;
}

export async function listSites({ db, ownerUserId }: ListSitesInput): Promise<{ status: 200; body: SiteResponse[] }> {
  const rows = await db.select().from(sites).where(eq(sites.ownerUserId, ownerUserId));
  return { status: 200, body: rows.map(toSiteResponse) };
}
