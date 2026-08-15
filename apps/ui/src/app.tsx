import { Route, Routes } from "react-router"

import { LoginPage } from "@/features/auth/login.page"
import { RequireAuth } from "@/features/auth/require-auth"
import { SignupPage } from "@/features/auth/signup.page"
import { ExperimentResultsPage } from "@/features/experiments/experiment-results.page"
import { SitesPage } from "@/features/sites/sites.page"
import { NotFoundPage } from "@/not-found.page"
import { ROUTES } from "@/routes"

export function App() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.signup} element={<SignupPage />} />
      <Route element={<RequireAuth />}>
        <Route path={ROUTES.sites} element={<SitesPage />} />
        <Route
          path={ROUTES.experimentResults}
          element={<ExperimentResultsPage />}
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
