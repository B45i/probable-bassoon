import { z } from "@hono/zod-openapi";

/**
 * The OpenAPI response/request boilerplate every route was hand-repeating. Nothing here
 * is route-specific — it's just the shape `createRoute()` always wants, factored out
 * once instead of retyped at every call site.
 */

/** Wraps a zod schema as an `application/json` content spec — the same shape
 * `createRoute()` wants for both request bodies and responses. */
export function jsonContent<T extends z.ZodTypeAny>(schema: T) {
  return { "application/json": { schema } };
}

export const errorSchema = z.object({ error: z.string() });
export type ErrorBody = z.infer<typeof errorSchema>;

/** A `responses[code]` entry for the common "here's an error message" case. */
export function errorResponseSpec(description: string) {
  return { description, content: jsonContent(errorSchema) };
}

export const UNAUTHORIZED_RESPONSE = errorResponseSpec("Unauthorized");

/** `createRoute({ security: BEARER_AUTH })` — every route that requires `requireAuth`
 * (see lib/auth/middleware.ts) declares this so it shows up correctly in the OpenAPI
 * doc; Hono itself doesn't read this array, only the doc generator does. */
export const BEARER_AUTH = [{ bearerAuth: [] }];
