import { Link } from "react-router"

import { ROUTES } from "@/routes"

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 text-sm">
      <p>Page not found.</p>
      <Link to={ROUTES.sites} className="underline underline-offset-4">
        Back to sites
      </Link>
    </div>
  )
}
