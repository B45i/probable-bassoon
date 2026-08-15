import { Route, Routes } from "react-router"

import { LoginPage } from "@/features/auth/login.page"
import { SignupPage } from "@/features/auth/signup.page"
import { ExperimentResultsPage } from "@/features/experiments/experiment-results.page"
import { SiteDetailPage } from "@/features/sites/site-detail.page"
import { SitesPage } from "@/features/sites/sites.page"
import { NotFoundPage } from "@/not-found.page"
import { ROUTES } from "@/routes"

import { AppLayout } from "./app.layout"
import { RequireAuth } from "./require-auth"

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.signup} element={<SignupPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.sites} element={<SitesPage />} />
          <Route path={ROUTES.site} element={<SiteDetailPage />} />
          <Route
            path={ROUTES.experimentResults}
            element={<ExperimentResultsPage />}
          />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
