/**
 * Tracking, Config, and Results share this Worker — none of them sit on the critical
 * page-render path visitors hit on every load, so isolating them from each other buys
 * nothing. Isolated from Assignment (apps/assignment) by being a separate deployment
 * entirely: a bug or bad deploy here can never touch the hot path.
 *
 * This is the actual Worker entry point (wrangler.jsonc `main`) — it's what re-exports
 * the Durable Object class wrangler's `durable_objects` binding needs to find. The Hono
 * app itself lives in ./app so it can be imported without the DO's `cloudflare:workers`
 * dependency (see ./app for why that split exists).
 */
export { ExperimentExposures } from "./durable-objects/experiment-exposures";
export { default } from "./app";
