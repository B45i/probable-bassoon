/**
 * Every route path in this app, in one place. Each router's `createRoute({ path })` uses
 * the relative form; app.ts's `app.route(base, ...)` uses the base; tests compose the
 * full form from the same constants — nothing hardcodes a path string more than once.
 */

function composePath(base: string, relative: string): string {
  // Hono's `.route(base, subApp)` maps a sub-app's own "/" route to exactly `base`, not
  // `base + "/"` — mirror that here so the composed constant matches what's actually
  // reachable, not a naive concatenation.
  return relative === "/" ? base : `${base}${relative}`;
}

export const HEALTH_PATH = "/health";
export const OPENAPI_PATH = "/openapi.json";
export const DOCS_PATH = "/docs";

export const AUTH_BASE = "/v1/auth";
export const AUTH_PATHS = {
  signup: "/signup",
  login: "/login",
  me: "/me",
} as const;
export const AUTH_ROUTES = {
  signup: composePath(AUTH_BASE, AUTH_PATHS.signup),
  login: composePath(AUTH_BASE, AUTH_PATHS.login),
  me: composePath(AUTH_BASE, AUTH_PATHS.me),
} as const;

export const SITES_BASE = "/v1/sites";
export const SITES_PATHS = {
  root: "/",
} as const;
export const SITES_ROUTES = {
  root: composePath(SITES_BASE, SITES_PATHS.root),
} as const;

// Nested under sites, not a flat /v1/experiments — an experiment belongs to exactly one
// site, and addressing it by `key` alone is ambiguous across sites: a user can own more
// than one site, and an experiment's key is only guaranteed unique within its own site,
// not across the whole platform.
//
// Split into two mount points — collection (create) and by-key (status, and later
// generate/results) — rather than one base with `:key` left in the relative path.
// That's not just REST tidiness: @hono/zod-openapi's `.route()` merge only converts
// `:param` to OpenAPI's `{param}` syntax for params already in the mount prefix, not
// ones left in the sub-app's own route path (a confirmed upstream gap, see
// https://github.com/honojs/middleware/issues/952 for the related basePath case).
// Keeping every param in the prefix sidesteps it — actual HTTP routing was never
// affected, only the generated OpenAPI doc (and therefore the generated client) was.
export const EXPERIMENTS_BASE = `${SITES_BASE}/:siteId/experiments`;
export const EXPERIMENTS_PATHS = {
  root: "/",
} as const;

export const EXPERIMENT_BASE = `${SITES_BASE}/:siteId/experiments/:key`;
export const EXPERIMENT_PATHS = {
  status: "/status",
  results: "/results",
} as const;

/** Params can't be baked into a static constant the way AUTH_ROUTES/SITES_ROUTES are —
 * tests (and anything else needing a concrete URL) call these instead. */
export const experimentsRoute = (siteId: string): string => `${SITES_BASE}/${siteId}/experiments`;
export const experimentStatusRoute = (siteId: string, key: string): string =>
  `${SITES_BASE}/${siteId}/experiments/${key}/status`;
export const experimentResultsRoute = (siteId: string, key: string): string =>
  `${SITES_BASE}/${siteId}/experiments/${key}/results`;

export const EVENTS_BASE = "/v1/events";
export const EVENTS_PATHS = {
  exposure: "/exposure",
  conversion: "/conversion",
} as const;
export const EVENTS_ROUTES = {
  exposure: composePath(EVENTS_BASE, EVENTS_PATHS.exposure),
  conversion: composePath(EVENTS_BASE, EVENTS_PATHS.conversion),
} as const;
