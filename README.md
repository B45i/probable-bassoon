# A/B Testing Service

A lightweight service that assigns website visitors to experiment variants, tracks exposures and conversions, and reports which variant is winning — callable from a small JavaScript snippet on any page load.

Given a visitor and one or more active experiments, the service returns the variant that visitor should see, deterministically and without storing any per-visitor state. It also records exposure and conversion events, and reports per-experiment results with statistical confidence.

The core constraint driving the design: assignment happens while a customer's page is rendering, so it must be fast and must never be able to break the page.

## Stack

Built on Cloudflare's edge platform:

- **Workers** — assignment, tracking, config, and results, running at the edge close to each visitor
- **KV** — experiment configuration, replicated globally
- **Durable Objects** — exposure tracking, sharded per experiment
- **D1** — experiment/variant configuration and conversion events

## Production

| Piece         | URL                                                            |
| -------------- | ---------------------------------------------------------------- |
| UI (dashboard) | https://ab-tester-ui-43c.pages.dev                                |
| control-plane  | https://ab-tester-control-plane.ab-testing-app.workers.dev        |
| assignment     | https://ab-tester-assignment.ab-testing-app.workers.dev           |

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for how these got deployed and how to
redeploy them.

## Apps and packages

A Turborepo/pnpm-workspaces monorepo. `apps/*` are the deployables; `packages/*` are
shared code, none of them independently deployed.

**Apps**

- **`apps/control-plane`** — the Worker on the non-critical path: auth, sites,
  experiment config, tracking (exposure/conversion ingestion), and results. Owns D1 and
  the `ExperimentExposures` Durable Object, and writes experiment config through to KV.
- **`apps/assignment`** — the Worker on the critical path: `GET /v1/assign` and
  `GET /snippet.js`. Reads config from KV only — no D1, no Durable Object access — so
  nothing on this path can be slowed down or broken by anything control-plane does.
- **`apps/ui`** — the admin dashboard (React/Vite): sign up, manage sites, create and
  monitor experiments, view results. Talks to control-plane's API only; never touches
  assignment directly.

**Packages**

- **`packages/shared`** — the assignment algorithm itself (murmur3 hash, bucketing,
  stats for results) and the KV config schema — imported by both `control-plane` (which
  writes config) and `assignment` (which reads it and buckets visitors), so the two
  Workers can never disagree about what a valid config or a correct bucketing looks
  like.
- **`packages/db`** — Drizzle ORM schema and D1 client, used by `control-plane` only
  (`assignment` never touches D1 — see D2/D6 in the design doc).
- **`packages/snippet`** — the browser-facing JS snippet (`window.ABTester` —
  `ready`/`trackExposure`/`trackConversion`), bundled as an IIFE and served by
  `assignment` at `/snippet.js`. Built independently, then its output is inlined into
  `assignment`'s own build.
- **`packages/api-client`** — a typed client (hey-api + React Query hooks) generated
  from `control-plane`'s OpenAPI spec, committed to git (not gitignored, unlike the
  other generated artifacts here) since it's what `apps/ui` imports directly.
- **`packages/perf`** — load-testing scripts for the two things in this system with a
  real performance requirement: assignment latency and Durable Object write throughput.
  Not part of the deployed system; run by hand against a live deployment.
- **`packages/tsconfig`** — shared `tsconfig.json` bases, nothing runtime.

## Running locally

**Setup (once):**

```
pnpm install
cp apps/control-plane/.dev.vars.example apps/control-plane/.dev.vars   # then fill in JWT_SECRET
pnpm --filter @ab-tester/control-plane db:migrate:local                # applies D1 migrations to local dev state
```

**Run:**

```
pnpm dev
```

Starts both Workers together (via Turborepo) plus `packages/snippet`'s watch build:

- Control plane (auth, sites, config, tracking, results) → `http://localhost:8787`
- Assignment (the `/v1/assign` + `/snippet.js` Worker) → `http://localhost:8788`

The two are separate `wrangler dev` processes, so by default each simulates its own local KV/D1/Durable Object storage — Assignment would never see what Config just wrote. Both `dev` scripts pass `--persist-to ../../.wrangler-state` to point at one shared directory instead, so a KV write in control-plane is actually visible to a read in assignment, matching how they'd behave in production (one real KV namespace, two Workers).

`Internal Server Error` on anything that touches D1 (e.g. `/v1/auth/signup`) means migrations haven't been applied to that shared directory — re-run `pnpm --filter @ab-tester/control-plane db:migrate:local`. Needed again any time `.wrangler-state/` is deleted.

**Testing:**

- `pnpm test` runs the full automated suite (`vitest` + `@cloudflare/vitest-pool-workers`, real Workers runtime semantics — no dev server needed).
- Exercise the running system by hand with `curl`, or the browsable Swagger UI at `/docs` on each Worker (`http://localhost:8787/docs` for control plane, `http://localhost:8788/docs` for assignment). Typical flow: sign up → log in → create a site → create an experiment → set it `running` → `GET /v1/assign` on the Assignment Worker with that site's key.
- `packages/snippet/demo.html` — a fake customer page with a real embed snippet hardcoded in, copied verbatim from an experiment's results page in the admin UI, the same as a real customer would paste it into their own site. Open it as-is, or swap in the `<script>` tag (and matching `EXPERIMENT_KEY`) from your own experiment. Renders like a real page — default content until assigned, then the variant's headline, a working "Sign up" button, and a bottom strip to simulate a new visitor.
- `packages/perf` load-tests the two things with real performance requirements — Assignment latency and per-experiment Durable Object write throughput. See its own README for usage.

## Documentation

- [`docs/DESIGN.md`](docs/DESIGN.md) — the system design: architecture, key decisions, determinism, scale, reliability, correctness, and the LLM integration
- [`docs/CODING-STANDARDS.md`](docs/CODING-STANDARDS.md) — route file layout, and how the API code avoids repeating itself
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step production deployment to Cloudflare, and how to redeploy after that
- [`docs/staff-principal-engineer-takehome-assignment-brief.md`](docs/staff-principal-engineer-takehome-assignment-brief.md) — the original brief
