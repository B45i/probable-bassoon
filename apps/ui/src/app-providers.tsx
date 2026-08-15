import { QueryClientProvider } from "@tanstack/react-query"
import { Provider as JotaiProvider } from "jotai"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import type { ReactNode } from "react"
import { BrowserRouter } from "react-router"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { ApiProvider } from "@/lib/api-provider"
import { store } from "@/lib/jotai-store"
import { queryClient } from "@/lib/query-client"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <NuqsAdapter>
        <JotaiProvider store={store}>
          <ApiProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <Toaster>{children}</Toaster>
              </ThemeProvider>
            </QueryClientProvider>
          </ApiProvider>
        </JotaiProvider>
      </NuqsAdapter>
    </BrowserRouter>
  )
}
