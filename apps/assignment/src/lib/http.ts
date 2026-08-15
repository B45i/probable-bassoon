import { z } from "@hono/zod-openapi";

/** Wraps a zod schema as an `application/json` content spec — the shape `createRoute()`
 * wants for responses. No `errorSchema`/`errorResponseSpec` here unlike control-plane's
 * lib/http.ts: this Worker never returns an error response — uncertainty (a missing
 * experiment, a malformed KV entry, an unknown site key) resolves to omitting that
 * experiment from an otherwise-200 response, never to a 4xx/5xx. */
export function jsonContent<T extends z.ZodTypeAny>(schema: T) {
  return { "application/json": { schema } };
}
