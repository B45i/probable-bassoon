import { useAtomValue } from "jotai"
import { Navigate, Outlet } from "react-router"

import { authTokenAtom } from "@/features/auth/auth-store"
import { ROUTES } from "@/routes"

/**
 * A guard, nothing else: redirects to /login when there's no stored token, otherwise
 * renders whatever's nested under it. What that is — the sidebar, the nav, the rest of
 * the app chrome — is app.layout.tsx's job, not this one's.
 */
export function RequireAuth() {
  const token = useAtomValue(authTokenAtom)

  if (!token) {
    return <Navigate to={ROUTES.login} replace />
  }

  return <Outlet />
}
