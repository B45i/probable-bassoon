import { client } from "@ab-tester/api-client"

import { store } from "@/lib/jotai-store"

import { authTokenAtom } from "./auth-store"

/**
 * Every generated call for a route declared with `security: BEARER_AUTH` (see
 * apps/control-plane's lib/http.ts) asks the client for a token before sending the
 * request — this is that callback. It reads the same jotai store React does, so logging
 * in from any page takes effect on the very next request with no header-setting
 * anywhere else in the app. Call once, before the app renders.
 */
export function configureApiAuth(): void {
  client.setConfig({
    auth: () => store.get(authTokenAtom) ?? undefined,
  })
}
