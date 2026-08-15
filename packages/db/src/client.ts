import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Thin wrapper so every consumer builds the same shape (schema attached, relational
 * query API enabled) from the raw D1 binding, rather than each call site repeating
 * `drizzle(d1, { schema })` itself.
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
