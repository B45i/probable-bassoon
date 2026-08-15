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

## Documentation

- [`docs/DESIGN.md`](docs/DESIGN.md) — the system design: architecture, key decisions, determinism, scale, reliability, correctness, and the LLM integration
- [`docs/staff-principal-engineer-takehome-assignment-brief.md`](docs/staff-principal-engineer-takehome-assignment-brief.md) — the original brief
