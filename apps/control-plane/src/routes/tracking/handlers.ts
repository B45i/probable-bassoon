import { conversions, type Database, type NewConversion } from "@ab-tester/db";
import type { ExperimentExposures } from "../../durable-objects/experiment-exposures";

interface RecordExposureInput {
  exposures: DurableObjectNamespace<ExperimentExposures>;
  siteKey: string;
  experiment: string;
  variant: string;
  visitorId: string;
}

/** No validation against D1 or KV that the site or experiment are real — same "resolve
 * uncertainty silently, don't error" stance Assignment takes, and for the same reason:
 * the object is addressed by name, not looked up, so there's nothing to 404 against. A
 * bogus name just creates a small, unused Durable Object that Results will never query,
 * since Results only ever asks for objects belonging to experiments D1 actually has. */
export async function recordExposure(input: RecordExposureInput): Promise<{ status: 202 }> {
  const { exposures, siteKey, experiment, variant, visitorId } = input;
  const stub = exposures.get(exposures.idFromName(`${siteKey}:${experiment}`));
  // Awaited, not fired-and-forgotten: a 202 here should mean the exposure is durably
  // recorded, not just that the RPC call was issued. The call itself is cheap (a local
  // SQLite insert inside the object), so this doesn't cost the visitor anything —
  // Tracking isn't on the page-render path regardless.
  await stub.recordExposure(visitorId, variant);
  return { status: 202 };
}

interface RecordConversionInput {
  db: Database;
  siteKey: string;
  visitorId: string;
  goal: string;
}

/** First conversion per goal wins — the table's composite primary key
 * (`site_key`, `visitor_id`, `goal_key`) makes a repeat conversion a no-op insert, same
 * dedupe-by-construction approach as exposures. */
export async function recordConversion(input: RecordConversionInput): Promise<{ status: 202 }> {
  const { db, siteKey, visitorId, goal } = input;
  const row: NewConversion = { siteKey, visitorId, goalKey: goal, firstTs: new Date() };
  await db.insert(conversions).values(row).onConflictDoNothing();
  return { status: 202 };
}
