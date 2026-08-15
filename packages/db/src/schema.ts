import { relations, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

/**
 * D1 schema — config, conversions, and users for admin authentication. Admin auth is a
 * stateless JWT verified by signature, so there's no sessions table: nothing about a
 * login is persisted after it's issued. Durable Object exposure storage isn't modelled
 * here either — it's a single table with one query shape, queried through the DO's own
 * SQLite storage API directly, not Drizzle.
 *
 * Primary keys on users/sites/experiments/variants are UUIDv7 rather than autoincrement
 * integers: this is a multi-tenant system (many independent customer sites share one
 * deployment), and a sequential integer id leaks how many users/experiments/sites exist
 * across the whole platform to anyone who can see one. UUIDv7 keeps the time-ordered
 * insert locality autoincrement gave up, without the enumeration leak. Conversions keep
 * their natural composite key — no surrogate id needed there.
 */

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  /** PBKDF2, never plaintext — see apps/control-plane/src/lib/auth/password.ts. */
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export const sites = sqliteTable("sites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  /** Public, ships in the browser snippet embedded in the customer's page — not a secret. */
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
    /** Bumped, with a new salt, whenever variant weights change while running — changing
     * a live split's boundaries in place would silently reassign visitors who were
     * already bucketed, so it's treated as a new version instead. */
    version: integer("version").notNull().default(1),
    salt: text("salt").notNull(),
    status: text("status", { enum: ["draft", "running", "paused", "archived"] })
      .notNull()
      .default("draft"),
    /** Basis points, 10000 = 100%. May only increase once running — narrowing it would
     * drop visitors who were already included. */
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
    /** JSON, serialized; also written through to KV alongside the rest of the
     * experiment's config. */
    content: text("content", { mode: "json" }).notNull().default("{}"),
  },
  (table) => [uniqueIndex("variants_experiment_id_key_unique").on(table.experimentId, table.key)],
);

export type Variant = InferSelectModel<typeof variants>;
export type NewVariant = InferInsertModel<typeof variants>;

// Conversions stay centralized here, not sharded like exposures: lower volume than
// exposures, and no natural single shard to route to — a visitor may have been exposed
// to several experiments before converting, so a conversion doesn't know in advance
// which one to credit. Dedupe still needs just one constraint (the primary key below).
//
// Keyed by the site's public key, not `sites.id`: Tracking (the only writer) only ever
// has the public key from the incoming request, the same situation Assignment is in for
// KV, and the same reasoning applies — writing it through unchanged avoids a lookup that
// would buy nothing. Results (the only reader) already has it for free too: it loads the
// site row to check ownership before querying anything, and that row already carries the
// public key alongside the id.
export const conversions = sqliteTable(
  "conversions",
  {
    siteKey: text("site_key").notNull(),
    visitorId: text("visitor_id").notNull(),
    goalKey: text("goal_key").notNull(),
    firstTs: integer("first_ts", { mode: "timestamp" }).notNull(),
  },
  // First conversion per goal wins.
  (table) => [primaryKey({ columns: [table.siteKey, table.visitorId, table.goalKey] })],
);

export type Conversion = InferSelectModel<typeof conversions>;
export type NewConversion = InferInsertModel<typeof conversions>;

// Relations mirror the FKs above — they enable relational queries (e.g.
// `db.query.experiments.findMany({ with: { variants: true } })`) but add no constraints
// of their own. Conversions carry no relation: visitor identity is never stored
// server-side (just a client-side cookie), so there's no `visitors` table to reference,
// and what conversions need cross-referencing against — exposures — lives in a Durable
// Object, not a D1 table, so it's outside what Drizzle relations can express anyway.
// That cross-referencing happens in application code, not a join.
export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  owner: one(users, { fields: [sites.ownerUserId], references: [users.id] }),
  experiments: many(experiments),
}));

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  site: one(sites, { fields: [experiments.siteId], references: [sites.id] }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  experiment: one(experiments, { fields: [variants.experimentId], references: [experiments.id] }),
}));
