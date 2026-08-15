import { getV1SitesOptions } from "@ab-tester/api-client"
import { useQuery } from "@tanstack/react-query"

import { CreateSiteDialog } from "./create-site-dialog"
import { SiteList } from "./site-list"

export function SitesPage() {
  const sites = useQuery(getV1SitesOptions())

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Sites</h1>
        <CreateSiteDialog />
      </div>
      {sites.isPending && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {sites.isError && (
        <p className="text-sm text-destructive">Couldn't load sites.</p>
      )}
      {sites.data && <SiteList sites={sites.data} />}
    </div>
  )
}
