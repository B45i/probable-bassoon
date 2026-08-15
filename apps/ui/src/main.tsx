import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app"
import { AppProviders } from "@/app-providers"
import { configureApiAuth } from "@/features/auth/auth-client"

import "./index.css"

configureApiAuth()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
)
