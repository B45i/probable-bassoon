import { createStore } from "jotai"

/**
 * The one jotai store for this app, created outside the component tree so code that
 * isn't a React component — features/auth/auth-client.ts's request-time auth callback —
 * can read the same state <Provider store={store}> hands to every component's
 * useAtomValue()/useSetAtom(). Two separate stores would mean logging in never actually
 * reaches the API client.
 */
export const store = createStore()
