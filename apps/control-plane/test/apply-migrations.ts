import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Setup files run outside per-test-file storage isolation and may run more than once;
// applyD1Migrations() only applies migrations not already recorded, so this is safe to
// call unconditionally. TEST_MIGRATIONS is injected by vitest.config.ts, not a real
// binding — see test/env.d.ts.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
