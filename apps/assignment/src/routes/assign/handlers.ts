import { bucketVisitor, experimentConfigKey, experimentConfigSchema } from "@ab-tester/shared";
import type { AssignResponse } from "./schemas";

interface AssignInput {
  kv: KVNamespace;
  siteKey: string;
  visitorId: string;
  experimentKeys: string[];
}

export async function assign(input: AssignInput): Promise<{ status: 200; body: AssignResponse }> {
  const { kv, siteKey, visitorId, experimentKeys } = input;

  const resolved = await Promise.all(
    experimentKeys.map((experimentKey) => resolveAssignment(kv, siteKey, visitorId, experimentKey)),
  );

  return {
    status: 200,
    body: { assignments: resolved.filter((entry) => entry !== null) },
  };
}

async function resolveAssignment(
  kv: KVNamespace,
  siteKey: string,
  visitorId: string,
  experimentKey: string,
): Promise<AssignResponse["assignments"][number] | null> {
  const raw = await kv.get(experimentConfigKey(siteKey, experimentKey));
  if (!raw) {
    // No such experiment for this site, or KV hasn't caught up yet after a very recent
    // write — either way, indistinguishable from "not running" at this Worker.
    return null;
  }

  let config;
  try {
    config = experimentConfigSchema.parse(JSON.parse(raw));
  } catch {
    // Shouldn't happen — Config validates against this same schema before every write —
    // but this is the assignment hot path: any uncertainty resolves to omitting the
    // experiment, never to failing the whole request over one bad entry.
    return null;
  }

  if (config.status !== "running") {
    return null;
  }

  const bucketed = bucketVisitor(config, visitorId);
  if (!bucketed) {
    return null;
  }

  return { experiment: experimentKey, variant: bucketed.variant, content: bucketed.content };
}
