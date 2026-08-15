import { relations, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

/**
 * D1 schema — config and conversions (docs/DESIGN.md Appendix B.1). Durable Object
 * exposure storage (B.2) is not modelled here: it's a single table with one query shape,
 * queried through the DO's own SQLite storage API directly, not Drizzle.
 *
 * Primary keys on sites/experiments/variants are UUIDv7 rather than the autoincrement
 * integers shown in the doc's SQL: this is a multi-tenant system (C-2), and a sequential
 * integer id leaks how many experiments/sites exist across the whole platform to anyone
 * who can see one. UUIDv7 keeps the time-ordered insert locality autoincrement gave up,
 * without the enumeration leak. Conversions keep their natural composite key as documented
 * — no surrogate id needed there.
 */

export const sites = sqliteTable("sites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  apiKey: text("api_key").notNull().unique(),
  name: text("name").notNull(),
});

export type Site = InferSelectModel<typeof sites>;
export type NewSite = InferInsertModel<typeof sites>;

export const experiments = sqliteTable(
  "experiments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id),
    key: text("key").notNull(),
    /** Bumped, with a new salt, on any weight change while running (§5.3). */
    version: integer("version").notNull().default(1),
    salt: text("salt").notNull(),
    status: text("status", { enum: ["draft", "running", "paused", "archived"] })
      .notNull()
      .default("draft"),
    /** Basis points, 10000 = 100%. May only increase while running (§5.3). */
    trafficBp: integer("traffic_bp").notNull().default(10000),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("experiments_site_id_key_unique").on(table.siteId, table.key)],
);

export type Experiment = InferSelectModel<typeof experiments>;
export type NewExperiment = InferInsertModel<typeof experiments>;

export const variants = sqliteTable(
  "variants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id),
    key: text("key").notNull(),
    /** Basis points; fixed while running and sums to 10000 across an experiment's variants. */
    weightBp: integer("weight_bp").notNull(),
    isControl: integer("is_control", { mode: "boolean" }).notNull().default(false),
    /** JSON, serialized; also written through to KV (D2). */
    content: text("content", { mode: "json" }).notNull().default("{}"),
  },
  (table) => [uniqueIndex("variants_experiment_id_key_unique").on(table.experimentId, table.key)],
);

export type Variant = InferSelectModel<typeof variants>;
export type NewVariant = InferInsertModel<typeof variants>;

// Conversions stay centralized here (D4): lower volume than exposures, no natural single
// shard to route to, dedupe still needs just one constraint.
export const conversions = sqliteTable(
  "conversions",
  {
    siteId: text("site_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    goalKey: text("goal_key").notNull(),
    firstTs: integer("first_ts", { mode: "timestamp" }).notNull(),
  },
  // First conversion per goal wins.
  (table) => [primaryKey({ columns: [table.siteId, table.visitorId, table.goalKey] })],
);

export type Conversion = InferSelectModel<typeof conversions>;
export type NewConversion = InferInsertModel<typeof conversions>;

// Relations mirror the FKs above — they enable relational queries (e.g.
// `db.query.experiments.findMany({ with: { variants: true } })`) but add no constraints
// of their own. Conversions carry no relation: the doc's SQL declares no FK for them
// either (visitors are never a stored entity — A-1), and attribution is cross-referenced
// in application code, not joined (D4).
export const sitesRelations = relations(sites, ({ many }) => ({
  experiments: many(experiments),
}));

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  site: one(sites, { fields: [experiments.siteId], references: [sites.id] }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  experiment: one(experiments, { fields: [variants.experimentId], references: [experiments.id] }),
}));
