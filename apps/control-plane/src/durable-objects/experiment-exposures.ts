import { DurableObject } from "cloudflare:workers";

/**
 * One instance per experiment, addressed by (site_id, experiment_id) — routing an
 * exposure event to the right shard is a lookup, not a broadcast (D3). Enforces the
 * dedupe rule ("first exposure wins") against its own attached SQLite storage, keyed on
 * visitor_id (Appendix B.2). Also serves the aggregate exposure counts the Results
 * worker cross-references against D1 conversions (D4, Appendix B.3).
 *
 * Table schema and request handlers land with the tracking implementation.
 */
export class ExperimentExposures extends DurableObject<Env> {}
