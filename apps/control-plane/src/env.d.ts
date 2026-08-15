import type { ExperimentExposures } from "./durable-objects/experiment-exposures";

// Declared globally (rather than exported) so the Durable Object class can reference
// `Env` without importing this file — which would otherwise import back from the DO's
// own module for the DurableObjectNamespace<ExperimentExposures> generic below.
//
// Augmenting `Cloudflare.Env`, not a bare `interface Env`: @cloudflare/workers-types
// types `cloudflare:workers`'s `env` export (used in test setup files, see
// test/apply-migrations.ts) against the namespaced `Cloudflare.Env` specifically — it's
// also what `wrangler types` itself generates. The plain `Env` alias below exists so the
// rest of this codebase (app.ts, routes/*, the DO class) can keep referring to the short
// name without importing anything.
declare global {
  namespace Cloudflare {
    interface Env {
      /** Written through here after every D1 write; Assignment reads it, this Worker doesn't. */
      EXPERIMENT_CONFIG: KVNamespace;
      /** Experiment/variant config and conversions. */
      DB: D1Database;
      /** One object per experiment, addressed by (site_id, experiment_id). */
      EXPOSURES: DurableObjectNamespace<ExperimentExposures>;
      /** Worker secret, not declared in wrangler.jsonc — signs/verifies admin JWTs.
       * Local dev: apps/control-plane/.dev.vars (see .dev.vars.example). Deploy:
       * `wrangler secret put JWT_SECRET`. */
      JWT_SECRET: string;
    }
  }

  type Env = Cloudflare.Env;
}

export {};
