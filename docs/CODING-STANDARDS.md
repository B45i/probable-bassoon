# Coding standards

Conventions for the API surface in `apps/control-plane` (and `apps/assignment` once it
grows past a single route). These aren't style preferences — each one is here because a
specific piece of duplicated or scattered code caused a real problem: a route whose path
was typed out by hand in four places and could silently drift, response shapes
reconstructed twice in the same file, test types hand-copied from schemas that already
defined them. `routes/auth/` and `routes/sites/` are the reference implementation —
when in doubt, match what they do.

## Route file layout

Each resource gets its own directory under `routes/`, not a single flat file:

```
routes/<resource>/
  schemas.ts   zod request/response schemas, each with an exported z.infer<> type
  mappers.ts   DB row → response shape (only if a row is exposed in more than one route)
  handlers.ts  the actual logic — plain functions, no Hono Context (see below)
  index.ts     createRoute() defs + app.openapi() wiring; the only file that imports Hono
```

Not one file per HTTP verb — that's over-fragmentation for a handful of routes per
resource. The split is by *layer* (schema / mapping / logic / wiring), not by endpoint.

## No magic path strings

Every route path lives in `routes/paths.ts`, once — grouped under `routes/` because
that's specifically what it's about, not a general app-wide concern (that distinction is
also why `types.ts`, the actual app-wide contract, stays at `src/` root instead).
`app.ts`'s `app.route(BASE, ...)` calls, each router's `createRoute({ path })`, and every
test's request URL all import from there — nothing types out `/v1/auth/login` or
`/v1/sites` as a string literal anywhere else. Rename a route and everything that references it either updates automatically or
fails to compile; it doesn't silently 404 in a test six months later.

## Shared response shapes live in `lib/http.ts`

`jsonContent(schema)`, `errorSchema` / `errorResponseSpec(description)`, `BEARER_AUTH`,
`UNAUTHORIZED_RESPONSE` — the OpenAPI boilerplate every route needs (the
`{ content: { "application/json": { schema } } }` wrapper, the `{ error: string }` shape,
the security block) is defined once and imported, not retyped at every `createRoute()`
call.

## Auth goes on the route, not a separate `app.use()` call

```ts
const meRoute = createRoute({
  path: AUTH_PATHS.me,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  // ...
});
```

Not `app.use("/me", requireAuth)` as a separate line elsewhere in the file. `createRoute`
supports `middleware` directly — colocating it with the route means there's no second
path string that has to be kept in sync with the first one by eye.

## Request-scoped resources are attached by middleware, not rebuilt per handler

`lib/db.ts`'s `attachDb` sets `c.set("db", createDb(c.env.DB))` once per request; route
wiring reads `c.get("db")`. A handler never calls `createDb(c.env.DB)` itself. Same
principle as auth: build it once, read it wherever it's needed.

## Handlers are plain functions, not Hono handlers

```ts
// handlers.ts — no Context, no c.json, testable by calling it directly
export async function signup(input: { db: Database; email: string; password: string }) {
  // ...
  return { status: 201, body: { id, email, createdAt } } as const;
}

// index.ts — the only place that knows Hono exists
app.openapi(signupRoute, async (c) => {
  const result = await handlers.signup({ db: c.get("db"), ...c.req.valid("json") });
  return c.json(result.body, result.status);
});
```

A handler takes exactly the inputs it needs (explicit fields, not a Context grab-bag) and
returns a `{ status, body }` pair matching the route's declared responses. It can be
called directly in a unit test with plain arguments — no need to spin up the app or
Miniflare to test business logic. `index.ts` is the thin layer that wires HTTP concerns
(reading the validated body, reading `c.env`, calling `c.json`) to the handler.

## DB rows exposed in more than one route go through a mapper

If two routes both turn the same table row into a response body — `routes/sites/`'s
`create` and `list` both expose a `Site` as `{ id, name, apiKey, ownerUserId }` — write
one `toXResponse(row)` function in `mappers.ts` and use it in both. A field added to the
table later can't leak by accident because one of two hand-written object literals
wasn't updated; there's only one.

## Types flow from schemas — tests don't redeclare them

Every schema in `schemas.ts` exports its inferred type:

```ts
export const authTokenResponseSchema = z.object({ token: z.string(), expiresAt: z.iso.datetime() });
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
```

Tests `import type { AuthTokenResponse } from "../src/routes/auth/schemas"` and use it
with `res.json<AuthTokenResponse>()`, instead of hand-declaring a second interface that
happens to describe the same shape. One definition; the schema is the source of truth,
not the test.

## Naming

- Zod schemas: `<thing>Schema` (`credentialsBodySchema`, `siteResponseSchema`) — never
  bare (`credentialsBody` reads like a value, not a schema).
- Inferred types: the schema name without the `Schema` suffix (`CredentialsBody`,
  `SiteResponse`).
- Path constants: `SCREAMING_SNAKE_CASE`, grouped per resource (`AUTH_PATHS.signup`,
  `AUTH_ROUTES.signup` for the full composed path).
