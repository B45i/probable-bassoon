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
