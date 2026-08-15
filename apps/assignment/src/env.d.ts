// Augmenting `Cloudflare.Env`, not a bare `interface Env`: @cloudflare/workers-types
// types `cloudflare:workers`'s `env` export (relevant in test setup files) against the
// namespaced `Cloudflare.Env` specifically — it's also what `wrangler types` itself
// generates. The plain `Env` alias below exists so the rest of this codebase can keep
// referring to the short name without importing anything (see apps/control-plane's
// src/env.d.ts, which explains the same split in more detail).
declare global {
  namespace Cloudflare {
    interface Env {
      /** Config, replicated globally; the only store this Worker ever touches. */
      EXPERIMENT_CONFIG: KVNamespace;
    }
  }

  type Env = Cloudflare.Env;
}

export {};
