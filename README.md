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

**Testing:**

- `pnpm test` runs the full automated suite (`vitest` + `@cloudflare/vitest-pool-workers`, real Workers runtime semantics — no dev server needed).
- There's no admin UI yet, so exercising the running system by hand means calling the API directly — `curl`, or import each Worker's `GET /openapi.json` into something like Postman/Insomnia for a browsable version. Typical flow: sign up → log in → create a site → create an experiment → set it `running` → `GET /v1/assign` on the Assignment Worker with that site's key.

## Documentation

- [`docs/DESIGN.md`](docs/DESIGN.md) — the system design: architecture, key decisions, determinism, scale, reliability, correctness, and the LLM integration
- [`docs/CODING-STANDARDS.md`](docs/CODING-STANDARDS.md) — route file layout, and how the API code avoids repeating itself
- [`docs/staff-principal-engineer-takehome-assignment-brief.md`](docs/staff-principal-engineer-takehome-assignment-brief.md) — the original brief
