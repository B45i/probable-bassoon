import type { Database } from "@ab-tester/db";
import type { ExperimentExposures } from "./durable-objects/experiment-exposures";

export interface AuthenticatedUser {
  id: string;
  email: string;
  /** ISO — carried in the JWT itself, not re-read from D1. */
  createdAt: string;
}

/** `Env` comes from the ambient `declare global` in ./env.d.ts. Every OpenAPIHono
 * instance in this app — the root app and every routes/* sub-router — is typed with
 * this, not a bare `{ Bindings: Env }`, so `c.get(...)` is typed wherever the relevant
 * middleware has run. `db` is set unconditionally by lib/db.ts's attachDb on every
 * resource sub-app that needs it; `kv` likewise by lib/kv.ts's attachKv (routes/experiments
 * only); `exposures` by lib/exposures.ts's attachExposures (routes/tracking only —
 * everything else that needs D1 goes through `db`, and this Worker's other DO-shaped
 * data doesn't exist); `user` only after lib/auth/middleware.ts's requireAuth. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    kv: KVNamespace;
    exposures: DurableObjectNamespace<ExperimentExposures>;
    user: AuthenticatedUser;
  };
};
