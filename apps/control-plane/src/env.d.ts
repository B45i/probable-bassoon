import type { ExperimentExposures } from "./durable-objects/experiment-exposures";

// Declared globally (rather than exported) so the Durable Object class can reference
// `Env` without importing this file — which would otherwise import back from the DO's
// own module for the DurableObjectNamespace<ExperimentExposures> generic below.
declare global {
  interface Env {
    /** Written through here after every D1 write; Assignment reads it, this Worker doesn't (D2). */
    EXPERIMENT_CONFIG: KVNamespace;
    /** Experiment/variant config and conversions (D6, Appendix B.1). */
    DB: D1Database;
    /** One object per experiment, addressed by (site_id, experiment_id) (D3, Appendix B.2). */
    EXPOSURES: DurableObjectNamespace<ExperimentExposures>;
  }
}

export {};
