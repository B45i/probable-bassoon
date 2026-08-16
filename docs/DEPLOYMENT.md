# Deployment

How to deploy this service to Cloudflare from a clean account, and how to redeploy it
after that. Every command below is run from the repo root unless noted.

## What gets deployed

| Piece                              | What it is                                    | Runs as               |
| ----------------------------------- | ---------------------------------------------- | ---------------------- |
| `apps/control-plane`                | Auth, sites, experiments, tracking, results    | Cloudflare Worker      |
| `apps/assignment`                   | `GET /v1/assign` and `GET /snippet.js`         | Cloudflare Worker      |
| `apps/ui`                           | Admin dashboard                                | Cloudflare Pages       |

Both Workers share one KV namespace (experiment config — control-plane writes it,
assignment only reads it). Only control-plane uses D1 (experiment/variant data,
conversions) and the `ExperimentExposures` Durable Object (exposure counts). The UI is a
static build with no server component of its own; it just calls the two Workers.

The steps below assume a clean Cloudflare account with no resources created yet —
follow them as-is for a first deploy, or as the reference for what each `wrangler.jsonc`
field and secret is for on a repo that's already live.

## Before you start

- A Cloudflare account. The free tier is enough to get everything running; check
  current Workers, KV, D1, and Durable Objects limits against your expected traffic
  before sending it real production load.
- Node 22+ and pnpm. The repo pins pnpm's version in `package.json` — run
  `corepack enable` once and it picks up the right one automatically.
- `pnpm install`, run once at the repo root.
- Logged in to Cloudflare:

  ```
  pnpm --filter @ab-tester/control-plane exec wrangler login
  ```

  If your login has more than one Cloudflare account on it (personal plus a team, for
  example), wrangler will ask you to pick one on every command below unless you
  disambiguate. See the warning right after this list before doing anything else in
  that situation — the obvious way to disambiguate isn't the reliable one.
- If this is a brand-new Cloudflare account, it has no `workers.dev` subdomain
  registered yet. Deploying a Worker still works, but the Worker isn't reachable at
  any URL until one is chosen. There's no CLI command for this — register one at
  `https://dash.cloudflare.com/<account-id>/workers/subdomain` before Step 4, or the
  first deploy will warn and print that same link.

### If you manage more than one Cloudflare account

Two real gotchas here, both found by hitting them, not by reading wrangler's docs:

- **Set `"account_id"` directly in both `wrangler.jsonc` files, not just
  `CLOUDFLARE_ACCOUNT_ID`.** For Workers, D1, and KV commands, `wrangler.jsonc`'s
  `account_id` field wins over the `CLOUDFLARE_ACCOUNT_ID` env var whenever both are
  set — so once it's in the config, every command run from that app directory
  reliably targets the right account, but the env var alone can quietly get
  overridden and hit the wrong one.
- **Cloudflare Pages commands (`pages project list`, `pages project delete`) do not
  reliably respect account targeting at all** — neither `CLOUDFLARE_ACCOUNT_ID` nor
  running from a directory with no `wrangler.jsonc` was enough to keep them scoped to
  the intended account in practice. Don't use the CLI to delete or list Pages
  projects when more than one account is in play; use the Cloudflare dashboard
  instead, where the active account is unambiguous.

One more, unrelated to account targeting but easy to get burned by right after:
**`wrangler delete` removes a Worker's secrets along with its code.** Redeploying
afterward brings the code back but not the secrets — `JWT_SECRET` has to be set again
with `wrangler secret put`, the same as a first-time setup.

## Step 1 — Create the shared KV namespace

```
pnpm --filter @ab-tester/control-plane exec wrangler kv namespace create EXPERIMENT_CONFIG
```

This prints an `id`. Paste it into the `kv_namespaces` block in **both**
`apps/control-plane/wrangler.jsonc` and `apps/assignment/wrangler.jsonc` — it has to be
the same ID in both files, since that's how the two Workers see the same data. If
you're targeting a non-default account, also add `"account_id"` to both files now (see
the warning above) — every command from here on assumes it's there.

## Step 2 — Create the D1 database

```
pnpm --filter @ab-tester/control-plane exec wrangler d1 create ab-tester
```

Paste the printed `database_id` into `apps/control-plane/wrangler.jsonc`'s
`d1_databases` block. Only control-plane uses D1, so this file is the only one that
needs it.

## Step 3 — Build

```
pnpm build
```

Runs everything through Turborepo, including generating the file assignment's `wrangler
deploy` needs: the browser snippet (`packages/snippet`) gets built, then bundled into
`apps/assignment/src/generated/snippet-source.ts`. Skipping this step means assignment's
deploy fails outright — that file doesn't exist until this runs.

This first build doesn't know control-plane's URL yet (it isn't printed until Step 4),
so the snippet's tracking calls (`trackExposure`/`trackConversion`) fall back to
assignment's own origin — wrong, and silently so (see Step 4's note on `TRACKING_ORIGIN`
for the fix, right after both URLs are known).

## Step 4 — Deploy the two Workers

```
pnpm --filter @ab-tester/assignment run deploy
pnpm --filter @ab-tester/control-plane run deploy
```

The `run` is required — `pnpm deploy` (no `run`) is pnpm's own reserved subcommand for
a different feature entirely, and it fails with `ERR_PNPM_INVALID_DEPLOY_TARGET`
instead of running this package's `deploy` script.

Each command prints the Worker's URL, something like
`https://ab-tester-assignment.<your-subdomain>.workers.dev`. Note both down — the UI
build in Step 6 needs them, and so does the rebuild right below. If the URL doesn't
resolve for a minute or two right after a first deploy (freshly registered subdomain, or
a freshly created Worker), that's normal DNS/TLS propagation — retry rather than assume
something's wrong.

control-plane will be live but not fully working yet: nothing has applied the database
schema or set its JWT secret. `GET /health` on either Worker will already return `{"ok":
true}` at this point — that's a fine first check that the deploy itself worked.

**Now that control-plane's URL is known, rebuild and redeploy assignment with it wired
in** — `packages/snippet` bakes the tracking origin in at build time (`/v1/events/*`
lives on control-plane, not assignment, so it can't be derived from the snippet's own
script URL the way `/v1/assign` is):

```
TRACKING_ORIGIN=https://ab-tester-control-plane.<your-subdomain>.workers.dev pnpm build
pnpm --filter @ab-tester/assignment run deploy
```

Skipping this leaves exposure/conversion tracking silently broken — the snippet still
loads and assignment still works, `sendBeacon` still fires, it just 404s against the
wrong Worker with no visible error anywhere.

## Step 5 — Finish setting up control-plane

Apply the database schema:

```
pnpm --filter @ab-tester/control-plane exec wrangler d1 migrations apply DB --remote
```

This runs every file in `packages/db/migrations` against the real D1 database created
in Step 2. (The Durable Object needs no equivalent step — its migration is declared
directly in `wrangler.jsonc` and Cloudflare applies it automatically on first deploy.)

Set the JWT secret, which signs and verifies admin login tokens:

```
openssl rand -hex 32
pnpm --filter @ab-tester/control-plane exec wrangler secret put JWT_SECRET
```

Paste the generated value when prompted. This takes effect immediately — no redeploy
needed.

## Step 6 — Deploy the UI

Point the UI's build at the two Worker URLs from Step 4. Create
`apps/ui/.env.production` (gitignored, same as the local `.env`):

```
VITE_API_URL=https://ab-tester-control-plane.<your-subdomain>.workers.dev
VITE_ASSIGNMENT_URL=https://ab-tester-assignment.<your-subdomain>.workers.dev
```

Build it. Vite reads `.env.production` automatically for a production build, so nothing
else is needed:

```
pnpm --filter @ab-tester/ui build
```

This produces `apps/ui/dist`. The UI has no `wrangler.jsonc` of its own yet, so deploy
it with a one-off wrangler invocation rather than an npm script:

```
pnpm dlx wrangler@4 pages project create ab-tester-ui --production-branch main
pnpm dlx wrangler@4 pages deploy apps/ui/dist --project-name ab-tester-ui
```

The first command only needs to run once, ever. Each deploy prints the live URL —
`https://ab-tester-ui.pages.dev` by default, though `pages.dev` names are global across
every Cloudflare account, so if `ab-tester-ui` is already taken (by another account,
including one of your own), Cloudflare appends a short suffix instead, e.g.
`ab-tester-ui-43c.pages.dev` — whatever the create command actually prints is the real
one, don't assume the un-suffixed form.

## Verify

```
curl https://ab-tester-control-plane.<your-subdomain>.workers.dev/health
curl https://ab-tester-assignment.<your-subdomain>.workers.dev/health
```

Both should return `{"ok":true}`. Each Worker also serves a browsable API reference at
`/docs` (Swagger UI) — useful for the next check by hand.

Then walk through the real flow once, either via `/docs` or `curl`: sign up, log in,
create a site, create an experiment, set it `running`, then `GET /v1/assign` on the
assignment Worker with that site's key. Finally, open the deployed UI URL and confirm
you can log in and see the site you just created.

## Redeploying after a change

| Changed                          | Run                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Worker code only                 | `pnpm build`, then `pnpm --filter <app> run deploy`                    |
| A new D1 migration                | `wrangler d1 migrations apply DB --remote` (from control-plane), then redeploy control-plane |
| `packages/snippet`                | `TRACKING_ORIGIN=<control-plane URL> pnpm build`, then redeploy assignment |
| UI code                          | `pnpm --filter @ab-tester/ui build`, then `wrangler pages deploy apps/ui/dist --project-name ab-tester-ui` |

Safest to just always include `TRACKING_ORIGIN` when rebuilding assignment for any
reason, rather than trying to remember whether this particular change touched
`packages/snippet`.

`pnpm build` before deploying is always safe to run even when nothing relevant changed —
Turborepo caches unchanged tasks and skips them.

## Rolling back

Workers keep every previous deploy:

```
pnpm --filter @ab-tester/control-plane exec wrangler deployments list
pnpm --filter @ab-tester/control-plane exec wrangler rollback [deployment-id]
```

Same for assignment, filtering by its own package instead. Pages keeps every previous
deploy too — roll back from the Cloudflare dashboard's Pages project, or re-run `wrangler
pages deploy` against a previous local build.

## Secrets and config reference

| Name                    | Where               | Set with                                             |
| ------------------------ | -------------------- | ------------------------------------------------------- |
| `EXPERIMENT_CONFIG` (KV id) | Both `wrangler.jsonc` files | `wrangler kv namespace create`, pasted in by hand |
| `database_id` (D1)          | control-plane `wrangler.jsonc` | `wrangler d1 create`, pasted in by hand         |
| `JWT_SECRET`             | control-plane, Worker secret | `wrangler secret put JWT_SECRET`                 |
| `VITE_API_URL`           | UI build-time only    | `apps/ui/.env.production`                              |
| `VITE_ASSIGNMENT_URL`    | UI build-time only    | `apps/ui/.env.production`                              |
| `TRACKING_ORIGIN`        | `packages/snippet` build-time only | env var passed to `pnpm build` (see Step 4)     |

None of the KV/D1 IDs are secret — they're identifiers, not credentials — so they're
meant to be committed once filled in. `JWT_SECRET` and the two `.env.production`
values are not committed; `.gitignore` already excludes them. `TRACKING_ORIGIN` isn't
secret either (it's a public URL, same as `VITE_ASSIGNMENT_URL`) — it's just not in a
committed file because nothing in `packages/snippet` reads a `.env` file today.

## Known gaps before real production traffic

| Gap                                       | Current state                                                              | Close before                          |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| CORS is wide open (`origin: "*"`)         | Every JSON route on both Workers accepts requests from any origin              | Handling traffic from real, untrusted sites |
| Signup has no gate                        | Anyone who finds the control-plane URL can create an admin account            | Opening the dashboard to the public       |
| No custom domain                          | Both Workers and the UI sit on default `workers.dev` / `pages.dev` URLs        | Sharing a production link with customers  |
| No CI/CD                                  | Every step above is run by hand from a developer machine                       | More than one person deploys this         |

That last one is the natural next step: wiring up GitHub Actions (a `wrangler-action`
step for each Worker, plus `wrangler pages deploy` or Pages' own git integration for the
UI) so deploys stop depending on someone's local machine and local `wrangler login`.
