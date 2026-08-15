/**
 * Every client-side route path in this app, in one place — the react-router
 * counterpart to apps/control-plane's routes/paths.ts. app.tsx's <Route path> and every
 * page's navigate()/<Link to> call import from here; nothing else types out
 * "/sites/..." as a string literal.
 */
export const ROUTES = {
  login: "/login",
  signup: "/signup",
  sites: "/",
  experimentResults: "/sites/:siteId/experiments/:key",
} as const

/** Params can't be baked into a static path the way the routes above are — a page
 * building an actual link or redirect calls this instead. */
export const experimentResultsPath = (siteId: string, key: string): string =>
  `/sites/${siteId}/experiments/${key}`
