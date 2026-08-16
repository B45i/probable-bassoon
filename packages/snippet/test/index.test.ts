import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The one bug this file exists to catch: tracking (`/v1/events/*`) lives on a different
// deployed Worker than this script itself, and it's easy to accidentally reuse the
// script's own origin (correct for `/v1/assign`, wrong for tracking) without anything
// failing loudly — `sendBeacon` swallows the resulting 404 silently. Only a real request
// assertion like the ones below would have caught it; reading the source didn't.
const ASSIGN_ORIGIN = "https://assign.example.com";
const SITE_KEY = "site_test";
const EXPERIMENT_KEY = "hero_copy";

function mockCurrentScript(): void {
  // Deliberately not attached to the document — the code under test only ever reads
  // `document.currentScript`, and happy-dom tries to actually load any `<script src>`
  // that gets connected to the DOM, which is both unnecessary here and noisy in the
  // test output.
  const script = document.createElement("script");
  script.src = `${ASSIGN_ORIGIN}/snippet.js`;
  script.dataset.siteKey = SITE_KEY;
  script.dataset.experiments = EXPERIMENT_KEY;
  Object.defineProperty(document, "currentScript", { value: script, configurable: true });
}

function mockAssignResponse(assignments: Array<{ experiment: string; variant: string; content: unknown }>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ assignments }), { status: 200 }))),
  );
}

/** Fresh module evaluation per test — TRACKING_ORIGIN is read once, at import time. */
async function loadSnippet(): Promise<typeof import("../src/index")> {
  vi.resetModules();
  return import("../src/index");
}

describe("snippet init", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: vi.fn(() => true) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Object.defineProperty(document, "currentScript", { value: null, configurable: true });
  });

  it("requests assignment from the script's own origin", async () => {
    mockCurrentScript();
    mockAssignResponse([]);

    await loadSnippet();

    expect(fetch).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url).startsWith(`${ASSIGN_ORIGIN}/v1/assign?`)).toBe(true);
  });

  it("sends tracking calls to TRACKING_ORIGIN, not the script's own origin, when it's set", async () => {
    const trackingOrigin = "https://control-plane.example.com";
    vi.stubEnv("TRACKING_ORIGIN", trackingOrigin);
    mockCurrentScript();
    mockAssignResponse([{ experiment: EXPERIMENT_KEY, variant: "b", content: {} }]);

    const { ready, trackExposure, trackConversion } = await loadSnippet();
    await new Promise<void>((resolve) => ready(() => resolve()));

    trackExposure(EXPERIMENT_KEY);
    trackConversion("signup");

    const sendBeaconMock = vi.mocked(navigator.sendBeacon);
    expect(sendBeaconMock).toHaveBeenCalledTimes(2);
    for (const call of sendBeaconMock.mock.calls) {
      expect(String(call[0]).startsWith(`${trackingOrigin}/v1/events/`)).toBe(true);
    }
  });

  it("falls back to the script's own origin for tracking when TRACKING_ORIGIN is unset", async () => {
    mockCurrentScript();
    mockAssignResponse([{ experiment: EXPERIMENT_KEY, variant: "b", content: {} }]);

    const { ready, trackExposure } = await loadSnippet();
    await new Promise<void>((resolve) => ready(() => resolve()));
    trackExposure(EXPERIMENT_KEY);

    const sendBeaconMock = vi.mocked(navigator.sendBeacon);
    expect(String(sendBeaconMock.mock.calls[0]![0]).startsWith(`${ASSIGN_ORIGIN}/v1/events/`)).toBe(true);
  });

  it("resolves empty, without throwing, when the embed is missing site key/experiments", async () => {
    const script = document.createElement("script");
    script.src = `${ASSIGN_ORIGIN}/snippet.js`;
    Object.defineProperty(document, "currentScript", { value: script, configurable: true });

    const { ready } = await loadSnippet();
    const assignments = await new Promise((resolve) => ready(resolve));

    // Resolved synchronously, without ever attempting a fetch — `fetch` was never
    // stubbed for this test, so a real attempt would throw in this environment.
    expect(assignments).toEqual({});
  });
});
