import { atomWithStorage } from "jotai/utils"

// Namespaced so it can't collide with anything else that lands in localStorage.
const AUTH_TOKEN_STORAGE_KEY = "ab-tester.auth-token"

/** The signed JWT from POST /v1/auth/login or /signup. Backed by localStorage so a page
 * refresh doesn't sign the user out. Read by auth-client.ts (outside React, once per
 * request) to attach it to every authenticated call, and by require-auth.tsx (inside
 * React) to gate routes. */
export const authTokenAtom = atomWithStorage<string | null>(
  AUTH_TOKEN_STORAGE_KEY,
  null
)
