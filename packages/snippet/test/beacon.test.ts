import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendBeacon } from "../src/beacon";

describe("sendBeacon", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response())));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error — test-only cleanup of a property we stub per test.
    delete navigator.sendBeacon;
  });

  it("uses navigator.sendBeacon when it succeeds, and never falls back to fetch", () => {
    const sendBeaconMock = vi.fn((_url: string | URL, _data?: BodyInit | null) => true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: sendBeaconMock });

    sendBeacon("https://example.com/events/exposure", { visitor_id: "v1" });

    expect(sendBeaconMock).toHaveBeenCalledOnce();
    expect(sendBeaconMock.mock.calls[0]?.[0]).toBe("https://example.com/events/exposure");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to fetch with keepalive when sendBeacon reports failure", () => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: vi.fn(() => false) });

    sendBeacon("https://example.com/events/exposure", { goal: "signup" });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://example.com/events/exposure");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
  });

  it("falls back to fetch when the browser has no sendBeacon at all", () => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: undefined });

    sendBeacon("https://example.com/events/conversion", { goal: "signup" });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("never throws, even if sendBeacon itself throws", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon: vi.fn(() => {
        throw new Error("boom");
      }),
    });

    expect(() => sendBeacon("https://example.com/events/exposure", {})).not.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("never throws even if fetch itself throws synchronously", () => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: undefined });
    vi.stubGlobal("fetch", () => {
      throw new Error("boom");
    });

    expect(() => sendBeacon("https://example.com/events/exposure", {})).not.toThrow();
  });
});
