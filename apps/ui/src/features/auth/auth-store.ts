import { atomWithStorage } from "jotai/utils"

// Namespaced so it can't collide with anything else that lands in localStorage.
const AUTH_TOKEN_STORAGE_KEY = "ab-tester.auth-token"

export const authTokenAtom = atomWithStorage<string | null>(
  AUTH_TOKEN_STORAGE_KEY,
  null,
  undefined,
  { getOnInit: true }
)
