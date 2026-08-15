/// <reference types="@cloudflare/vitest-pool-workers/types" />
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// Merges into the same Cloudflare.Env declared in src/env.d.ts — TEST_MIGRATIONS isn't a
// real binding, it only exists because vitest.config.ts injects it via miniflare.bindings
// (see test/apply-migrations.ts). Scoped to test/ so it's never mistaken for something
// available in production. (No second `type Env = Cloudflare.Env` alias here — that's
// declared once in src/env.d.ts; redeclaring a global type alias, unlike an interface,
// doesn't merge, it conflicts.)
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
