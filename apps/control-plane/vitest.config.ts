import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Runs against real Workers runtime semantics (KV, D1, Durable Objects) via Miniflare,
// not mocks — the same bindings declared in wrangler.jsonc. The test D1 instance starts
// empty (isolated per test file), so migrations are applied via a setup file — see
// test/apply-migrations.ts.
const migrations = await readD1Migrations(
  path.join(import.meta.dirname, "..", "..", "packages", "db", "migrations"),
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // Deterministic and independent of .dev.vars (gitignored — a clean checkout or
        // CI won't have one), same reasoning as TEST_MIGRATIONS below.
        bindings: { TEST_MIGRATIONS: migrations, JWT_SECRET: "test-secret-do-not-use-in-production" },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
