export interface Env {
  /** Config, replicated globally; the only store this Worker ever touches (D1, D2). */
  EXPERIMENT_CONFIG: KVNamespace;
}
