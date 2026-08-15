import { experiments, sites, variants, type Database, type NewExperiment, type NewVariant } from "@ab-tester/db";
import { experimentConfigKey, experimentConfigSchema } from "@ab-tester/shared";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { toHex } from "../../lib/encoding";
import type { ErrorBody } from "../../lib/http";
import { toExperimentConfig, toExperimentResponse } from "./mappers";
import type { CreateExperimentBody, ExperimentResponse, SetStatusBody } from "./schemas";

const SALT_BYTES = 16;

/** 404, not 403, for a site the caller doesn't own — matching routes/sites: doesn't
 * confirm whether a site id that isn't theirs even exists. */
const SITE_NOT_FOUND: { status: 404; body: ErrorBody } = { status: 404, body: { error: "Site not found" } };

interface CreateExperimentInput extends CreateExperimentBody {
  db: Database;
  kv: KVNamespace;
  siteId: string;
  ownerUserId: string;
}

type CreateExperimentResult =
  | { status: 201; body: ExperimentResponse }
  | { status: 404; body: ErrorBody }
  | { status: 409; body: ErrorBody };

export async function createExperiment(input: CreateExperimentInput): Promise<CreateExperimentResult> {
  const { db, kv, siteId, ownerUserId, key, trafficBp, variants: variantInputs } = input;

  const [[site], [existing]] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, siteId)).limit(1),
    db
      .select({ id: experiments.id })
      .from(experiments)
      .where(and(eq(experiments.siteId, siteId), eq(experiments.key, key)))
      .limit(1),
  ]);

  if (!site || site.ownerUserId !== ownerUserId) {
    return SITE_NOT_FOUND;
  }
  if (existing) {
    return { status: 409, body: { error: "Experiment key already exists for this site" } };
  }

  // Generated up front, not left to the schema's $defaultFn: variant rows need the
  // experiment's id before either insert runs, so both can go in one atomic D1 batch —
  // D1's batch API can't chain a generated id from one statement into the next, so a
  // client-generated id (only possible because these are UUIDs, not autoincrement) is
  // what makes batching them together possible at all. Without the batch, a failed
  // variants insert would orphan an experiment row with none — invisible, but still
  // occupying the UNIQUE(site_id, key) slot, blocking a clean retry.
  const experimentId = uuidv7();
  const newExperiment: NewExperiment = {
    id: experimentId,
    siteId,
    key,
    salt: toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES))),
    trafficBp,
    createdAt: new Date(),
  };
  const newVariants: NewVariant[] = variantInputs.map((v) => ({
    id: uuidv7(),
    experimentId,
    key: v.key,
    weightBp: v.weightBp,
    isControl: v.isControl,
    content: v.content,
  }));

  const [[createdExperiment], createdVariants] = await db.batch([
    db.insert(experiments).values(newExperiment).returning(),
    db.insert(variants).values(newVariants).returning(),
  ]);
  if (!createdExperiment) {
    throw new Error("Experiment insert returned no row");
  }

  await writeThroughKv(kv, site.apiKey, createdExperiment, createdVariants);

  return { status: 201, body: toExperimentResponse(createdExperiment, createdVariants) };
}

interface SetExperimentStatusInput extends SetStatusBody {
  db: Database;
  kv: KVNamespace;
  siteId: string;
  ownerUserId: string;
  key: string;
}

type SetExperimentStatusResult = { status: 200; body: ExperimentResponse } | { status: 404; body: ErrorBody };

export async function setExperimentStatus(input: SetExperimentStatusInput): Promise<SetExperimentStatusResult> {
  const { db, kv, siteId, ownerUserId, key, status } = input;

  const [site, experiment] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, siteId)).limit(1).then((rows) => rows[0]),
    db.query.experiments.findFirst({
      where: and(eq(experiments.siteId, siteId), eq(experiments.key, key)),
      with: { variants: true },
    }),
  ]);

  if (!site || site.ownerUserId !== ownerUserId) {
    return SITE_NOT_FOUND;
  }
  if (!experiment) {
    return { status: 404, body: { error: "Experiment not found" } };
  }

  const [updated] = await db.update(experiments).set({ status }).where(eq(experiments.id, experiment.id)).returning();
  if (!updated) {
    throw new Error("Experiment update returned no row");
  }

  // Variants are untouched by a status change — no need to re-read them.
  await writeThroughKv(kv, site.apiKey, updated, experiment.variants);

  return { status: 200, body: toExperimentResponse(updated, experiment.variants) };
}

/** Every experiment write is mirrored to KV immediately after the D1 write, so Assignment
 * (which only ever reads KV, never D1) sees it without any propagation delay beyond
 * KV's own. Validated against the shared schema before it goes anywhere — this Worker is
 * the only writer, so a malformed blob here is a bug worth catching at the source, not
 * at Assignment's read. */
async function writeThroughKv(
  kv: KVNamespace,
  siteApiKey: string,
  experiment: Parameters<typeof toExperimentConfig>[0],
  experimentVariants: Parameters<typeof toExperimentConfig>[1],
): Promise<void> {
  const config = experimentConfigSchema.parse(toExperimentConfig(experiment, experimentVariants));
  await kv.put(experimentConfigKey(siteApiKey, experiment.key), JSON.stringify(config));
}
