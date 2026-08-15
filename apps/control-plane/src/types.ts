import type { Database } from "@ab-tester/db";

export interface AuthenticatedUser {
  id: string;
  email: string;
  /** ISO — carried in the JWT itself (D8), not re-read from D1. */
  createdAt: string;
}

/** `Env` comes from the ambient `declare global` in ./env.d.ts. Every OpenAPIHono
 * instance in this app — the root app and every routes/* sub-router — is typed with
 * this, not a bare `{ Bindings: Env }`, so `c.get(...)` is typed wherever the relevant
 * middleware has run. `db` is set unconditionally by lib/db.ts's attachDb on every
 * resource sub-app; `user` only after lib/auth/middleware.ts's requireAuth. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    user: AuthenticatedUser;
  };
};
