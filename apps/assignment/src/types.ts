/** `Env` comes from the ambient `declare global` in ./env.d.ts. `kv` is set unconditionally
 * by lib/kv.ts's attachKv — the only per-request resource this Worker needs, since it
 * never touches D1 or a Durable Object. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    kv: KVNamespace;
  };
};
