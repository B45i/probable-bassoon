import { QueryClient } from "@tanstack/react-query"

/** One instance for the app's lifetime, created outside the component tree so it
 * survives re-renders of whatever mounts <QueryClientProvider>. */
export const queryClient = new QueryClient()
