import { client } from "@ab-tester/api-client"
import type { ReactNode } from "react"

export function ApiProvider({ children }: { children: ReactNode }) {
  client.setConfig({ baseURL: import.meta.env.VITE_API_URL })
  return children
}
