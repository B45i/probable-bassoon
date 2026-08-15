import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only needs schema + out; it needs no D1 credentials because it
// never talks to a database, only diffs the schema against the existing migration files.
// Applying migrations is `wrangler d1 migrations apply`, not `drizzle-kit push`/`migrate` —
// keeps D1 as the source of truth for what's actually been run against it.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./migrations",
});
