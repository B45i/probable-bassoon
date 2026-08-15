import { DurableObject } from "cloudflare:workers";

interface ExposureRow {
  visitor_id: string;
  variant_key: string;
  first_ts: number;
  // Structural, not semantic: `SqlStorage.exec`'s generic requires an index signature so
  // it can express "any query shape", not just this one.
  [column: string]: string | number;
}

export interface Exposure {
  visitorId: string;
  variantKey: string;
  firstTs: number;
}

/**
 * One instance per experiment, addressed by name — `{site_key}:{experiment_key}`, built
 * directly from the incoming request (see routes/tracking/handlers.ts). Naming the
 * object this way instead of by an internal database id means routing an exposure event
 * costs nothing beyond the write itself: no D1 lookup to translate a public key into an
 * id first, no broadcast to every shard.
 *
 * Enforces "first exposure wins" against its own attached SQLite storage: `visitor_id`
 * is the primary key, so a second exposure for the same visitor is a no-op by
 * construction (`ON CONFLICT DO NOTHING`), not extra application-level dedupe logic.
 *
 * Conversions live centrally in D1 instead of sharded per experiment like this — they
 * don't have a single natural shard to route to, since one visitor can be exposed to
 * several experiments before converting. Joining the two happens in application code
 * (the Results worker), not a single query.
 */
export class ExperimentExposures extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Runs on every construction, not just the first — cheap and idempotent, and a DO's
    // constructor re-runs whenever the instance is evicted and later re-hydrated, so this
    // can't be a one-time setup step.
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS exposures (
        visitor_id  TEXT    NOT NULL,
        variant_key TEXT    NOT NULL,
        first_ts    INTEGER NOT NULL,
        PRIMARY KEY (visitor_id)
      )`,
    );
  }

  /** Called directly as an RPC method on the DO stub — no `fetch()`/manual routing
   * needed, this class's public methods are the interface. */
  recordExposure(visitorId: string, variantKey: string): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO exposures (visitor_id, variant_key, first_ts) VALUES (?, ?, ?) ON CONFLICT (visitor_id) DO NOTHING",
      visitorId,
      variantKey,
      Date.now(),
    );
  }

  /** Every exposure this experiment has recorded. Used by tests now; the Results worker
   * will use the same method later to compute per-variant counts and cross-reference
   * against D1 conversions by visitor id. */
  getExposures(): Exposure[] {
    return this.ctx.storage.sql
      .exec<ExposureRow>("SELECT visitor_id, variant_key, first_ts FROM exposures")
      .toArray()
      .map((row) => ({ visitorId: row.visitor_id, variantKey: row.variant_key, firstTs: row.first_ts }));
  }
}
