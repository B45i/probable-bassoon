export interface AuthenticatedUser {
  id: string;
  email: string;
  /** ISO — carried in the JWT itself (D8), not re-read from D1. */
  createdAt: string;
}

/** `Env` comes from the ambient `declare global` in ./env.d.ts. Every OpenAPIHono
 * instance in this app — the root app and every routes/* sub-router — is typed with
 * this, not a bare `{ Bindings: Env }`, so `c.get("user")` is typed wherever requireAuth
 * has run. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: AuthenticatedUser;
  };
};
