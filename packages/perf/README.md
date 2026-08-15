# @ab-tester/perf

Performance testing for the two things in this system actually worth measuring:

1. **Assignment latency** — the one hard SLA (design doc §2.3: under 10ms at the edge). Run against a real deployment to mean anything; local `wrangler dev` has no real edge network or KV replication, so it only shows the code's own CPU cost, not whether the SLA holds.
2. **Durable Object write throughput for one experiment** — the scalability risk the design doc names explicitly (§D3): a DO is single-threaded internally, so one very high-traffic experiment can saturate its own object's queue independent of overall platform load.

Everything else (Config, Results, Tracking's own overall throughput) has no latency SLA per the design doc's SLO table — not covered here.

## Usage

```
pnpm seed        # creates a user/site/running experiment through the real API,
                  # writes .perf-seed.json for the scripts below to read
pnpm assign       # load-tests GET /v1/assign
pnpm tracking     # ramps concurrency against POST /v1/events/exposure,
                  # all targeting the one experiment `seed` created
```

Env vars (all optional):

| Var                | Default                 | Used by            |
| ------------------ | ------------------------ | ------------------ |
| `CONTROL_PLANE_URL` | `http://localhost:8787`  | `seed`, `tracking`  |
| `ASSIGN_URL`        | `http://localhost:8788`  | `assign`            |
| `DURATION_MS`       | `10000` (assign) / `5000` (tracking) | both  |
| `CONCURRENCY`       | `50`                     | `assign`            |
| `CONCURRENCY_STEPS` | `10,50,100,200`          | `tracking`          |

Point `CONTROL_PLANE_URL`/`ASSIGN_URL` at a real deployment to get numbers that actually validate the SLA.
