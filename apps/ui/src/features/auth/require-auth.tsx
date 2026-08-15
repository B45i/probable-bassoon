import { useAtomValue, useSetAtom } from "jotai"
import { Link, Navigate, Outlet } from "react-router"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/routes"

import { authTokenAtom } from "./auth-store"

/**
 * Gates every route nested under it on a stored token. "Logged in" and "show the app
 * chrome" are the same condition here, so this doubles as the layout for those routes
 * instead of a separate wrapper component.
 */
export function RequireAuth() {
  const token = useAtomValue(authTokenAtom)
  const setToken = useSetAtom(authTokenAtom)

  if (!token) {
    return <Navigate to={ROUTES.login} replace />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <Link to={ROUTES.sites} className="text-sm font-medium">
          AB Tester
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setToken(null)}>
          Log out
        </Button>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
