import { getV1AuthMeOptions } from "@ab-tester/api-client"
import { IconLogout } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { useSetAtom } from "jotai"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { authTokenAtom } from "./auth-store"

function initialsFromEmail(email: string): string {
  const [localPart] = email.split("@")
  const segments = localPart.split(/[._-]+/).filter(Boolean)
  const chars =
    segments.length > 1 ? segments.slice(0, 2).map((segment) => segment[0]) : [...localPart.slice(0, 2)]
  return chars.join("").toUpperCase()
}

export function UserMenu() {
  const setToken = useSetAtom(authTokenAtom)
  const me = useQuery(getV1AuthMeOptions())

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <Avatar size="sm">
        <AvatarFallback>{me.data ? initialsFromEmail(me.data.email) : "…"}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate text-xs text-sidebar-foreground/70">{me.data?.email}</span>
      <Button variant="ghost" size="icon-sm" onClick={() => setToken(null)}>
        <IconLogout />
        <span className="sr-only">Log out</span>
      </Button>
    </div>
  )
}
