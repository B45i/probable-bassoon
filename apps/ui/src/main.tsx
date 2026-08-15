import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { AppProviders } from "@/app-providers"
import { configureApiAuth } from "@/features/auth/auth-client"
import { AppRouter } from "@/shell/router"

import "./index.css"

configureApiAuth()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>
)
