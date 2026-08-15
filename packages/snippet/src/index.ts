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
 */

const ASSIGNMENT_TIMEOUT_MS = 150;

export function init(): void {
  // Assignment fetch, exposure/conversion beacons, and the timeout/fallback logic land
  // with the tracking and assignment implementation.
}
