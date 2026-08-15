import { DurableObject } from "cloudflare:workers";

/**
 * One instance per experiment, addressed by (site_id, experiment_id) — routing an
 * exposure event to the right shard is a direct lookup (derive the DO id from those two
 * values), not a broadcast to every shard. Enforces "first exposure wins" against its own
 * attached SQLite storage: visitor_id is the primary key, so a second exposure for the
 * same visitor is naturally a no-op, not extra dedupe logic. Also serves the aggregate
 * exposure counts the Results worker needs — conversions live centrally in D1 rather
 * than sharded per experiment (they don't have a single natural shard to route to, unlike
 * exposures), so joining the two happens in application code, not one query.
 *
 * Table schema and request handlers land with the tracking implementation.
 */
export class ExperimentExposures extends DurableObject<Env> {}
