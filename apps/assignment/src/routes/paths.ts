/** Every route path in this app, in one place — same reasoning as control-plane's
 * routes/paths.ts. */
export const HEALTH_PATH = "/health";

// Served by this Worker, not a third-party CDN or a separate static-hosting resource —
// see docs/DESIGN.md's snippet-delivery decision for the full reasoning. Same domain
// `/v1/assign` is on, deliberately: the snippet itself derives the assignment origin
// from its own script URL at runtime, so the two have to be reachable at the same
// origin for that to work.
export const SNIPPET_PATH = "/snippet.js";

// Mounted at "/v1", not "/" — routes/assign's sub-app attaches KV via `use("*", attachKv)`,
// and a "*" middleware registered on a sub-app mounted at "/" ends up matching every path
// in the parent app, not just this resource's own route (health and openapi.json would
// 500 trying to read a KV binding that was never attached for their request). A real,
// non-root base scopes the "*" to this resource only, same as every other mount in this
// codebase.
export const ASSIGN_BASE = "/v1";
export const ASSIGN_PATHS = {
  assign: "/assign",
} as const;
export const ASSIGN_ROUTE = `${ASSIGN_BASE}${ASSIGN_PATHS.assign}`;
