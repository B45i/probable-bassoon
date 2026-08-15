/**
 * Fire-and-forget: never lets a tracking call affect the page, and never waits for a
 * response the caller has nowhere to act on anyway. `sendBeacon` is the right primitive
 * for this — the browser guarantees delivery is attempted even if the page is being
 * unloaded right after the call, which a plain `fetch` doesn't promise. `fetch` with
 * `keepalive` is the fallback for the rare browser without `sendBeacon`, not the
 * default.
 */
export function sendBeacon(url: string, body: unknown): void {
  try {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (navigator.sendBeacon?.(url, blob)) {
      return;
    }
  } catch {
    // Fall through to the fetch fallback below.
  }

  try {
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Nothing to do with a failed beacon — there's no UI state that depends on it.
    });
  } catch {
    // Never let a tracking call throw into the customer's page.
  }
}
