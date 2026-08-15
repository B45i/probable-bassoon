import { sendBeacon } from "./beacon";
import { getVisitorId } from "./cookie";

/**
 * Loaded on every customer page load. This is the client half of the critical path: it
 * must load asynchronously, never throw, enforce a hard 150ms timeout, and take no
 * action on any error so the page renders unchanged. The worst outcome this allows is
 * that a visitor sees default content — never a broken page.
 *
 * Deliberately dependency-free — this ships to every visitor's browser on every page
 * load, so its size is part of the latency budget it's trying to protect. It must not
 * import the generated API client (packages/api-client): that package exists for the
 * admin/results side and carries weight (and an optional react-query peer dependency)
 * this script can't afford.
 *
 * Bundled as a single IIFE (see tsup.config.ts's `globalName: "ABTester"`), not an ES
 * module — customers embed this with a plain `<script async src="…">` tag, not
 * `type="module"`, so it has to run as a classic script. Everything this module exports
 * becomes `window.ABTester`.
 *
 * Expected embed:
 *   <script async src="https://…/snippet.js"
 *           data-site-key="…" data-experiments="hero_copy,pricing_cta"></script>
 *
 * `data-site-key`/`data-experiments` on the script tag itself, not a query string on
 * its `src` — the script file is the same bytes for every customer and every page, so
 * it can be cached once at the edge and reused everywhere; putting per-customer values
 * in the URL would turn a single shared cache entry into one per customer.
 */

const ASSIGNMENT_TIMEOUT_MS = 150;

interface Assignment {
  variant: string;
  content: Record<string, unknown>;
}
type Assignments = Record<string, Assignment>;

interface AssignApiResponse {
  assignments: Array<{ experiment: string; variant: string; content: Record<string, unknown> }>;
}

interface Config {
  origin: string;
  siteKey: string;
  visitorId: string;
}

let config: Config | null = null;
let resolved: Assignments | null = null;
const readyQueue: Array<(assignments: Assignments) => void> = [];

function resolveWith(assignments: Assignments): void {
  resolved = assignments;
  while (readyQueue.length > 0) {
    readyQueue.shift()!(assignments);
  }
}

/**
 * Registers a callback for when assignment resolves — immediately, if it already has,
 * or queued until it does. There's no separate failure callback and no error case to
 * handle: per this system's own rule, uncertainty always resolves to "no assignments"
 * (an empty object), whether that's because the network call failed, timed out, or the
 * visitor simply isn't part of any of the requested experiments. A customer's `ready`
 * callback treats all three exactly the same way — falling back to whatever the page
 * already renders by default.
 */
function ready(callback: (assignments: Assignments) => void): void {
  if (resolved) {
    callback(resolved);
  } else {
    readyQueue.push(callback);
  }
}

/**
 * Call once a variant has actually been rendered onto the page — exposure is counted
 * on render, not on assignment, so this is a deliberate, separate step rather than
 * something fired automatically the moment assignment data arrives. The variant itself
 * isn't a parameter: it's whatever this script was already told for `experimentKey`, so
 * there's no way for a caller to accidentally report the wrong one.
 */
function trackExposure(experimentKey: string): void {
  if (!config || !resolved) {
    return;
  }
  const assignment = resolved[experimentKey];
  if (!assignment) {
    return;
  }
  sendBeacon(`${config.origin}/v1/events/exposure?site_key=${encodeURIComponent(config.siteKey)}`, {
    visitor_id: config.visitorId,
    experiment: experimentKey,
    variant: assignment.variant,
  });
}

/** Call whenever the customer's own conversion event happens (a signup, a purchase —
 * whatever `goal` names). Not tied to any particular experiment at the call site,
 * matching the server side: a conversion doesn't know in advance which experiment(s) it
 * should credit, so attribution happens later, in Results. */
function trackConversion(goal: string): void {
  if (!config) {
    return;
  }
  sendBeacon(`${config.origin}/v1/events/conversion?site_key=${encodeURIComponent(config.siteKey)}`, {
    visitor_id: config.visitorId,
    goal,
  });
}

function init(): void {
  try {
    const script = document.currentScript as HTMLScriptElement | null;
    const siteKey = script?.dataset.siteKey;
    const experiments = script?.dataset.experiments;
    if (!script || !siteKey || !experiments) {
      // Misconfigured or missing embed — nothing to fetch, resolve empty immediately
      // rather than leaving every `ready` callback waiting forever.
      resolveWith({});
      return;
    }

    // Derived from the script's own URL, not hardcoded: this script is served by the
    // same Worker as `/v1/assign` (see docs/DESIGN.md), so wherever it was loaded from
    // is exactly where the assignment call belongs too — dev, staging, and production
    // all resolve correctly with no build-time origin to keep in sync.
    const origin = new URL(script.src).origin;
    config = { origin, siteKey, visitorId: getVisitorId() };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ASSIGNMENT_TIMEOUT_MS);

    const query = new URLSearchParams({ site_key: siteKey, visitor_id: config.visitorId, experiments });
    fetch(`${origin}/v1/assign?${query.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<AssignApiResponse>) : Promise.reject(new Error("assign failed"))))
      .then((body) => {
        const byExperiment: Assignments = {};
        for (const assignment of body.assignments) {
          byExperiment[assignment.experiment] = { variant: assignment.variant, content: assignment.content };
        }
        resolveWith(byExperiment);
      })
      .catch(() => resolveWith({}))
      .finally(() => clearTimeout(timeoutId));
  } catch {
    // Whatever went wrong, it must never reach the customer's page.
    resolveWith({});
  }
}

init();

export { ready, trackExposure, trackConversion };
