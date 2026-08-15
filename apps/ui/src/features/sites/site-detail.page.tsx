import { getV1SitesOptions } from "@ab-tester/api-client"
import { IconArrowLeft, IconKey } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { initials } from "@/lib/initials"
import { ROUTES } from "@/routes"

import { CreateExperimentDialog } from "../experiments/create-experiment-dialog"
import { ExperimentList } from "../experiments/experiment-list"
import { CopyTextButton } from "./copy-text-button"
import { SiteSnippet } from "./site-snippet"

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>()
  // No GET /v1/sites/:id — this list is already fetched (and cached) by the sites page
  // a click away, so finding the one site here costs nothing extra most of the time.
  const sites = useQuery(getV1SitesOptions())
  const site = sites.data?.find((s) => s.id === siteId)

  if (sites.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!site) {
    return <p className="text-sm text-destructive">Site not found.</p>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Link
        to={ROUTES.sites}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Sites
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials(site.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold">{site.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconKey className="size-3.5 shrink-0" />
                <span className="shrink-0">Site key</span>
                <code className="text-foreground">{site.apiKey}</code>
                <CopyTextButton text={site.apiKey} label="Site key" />
              </div>
            </div>
          </div>
          <CreateExperimentDialog siteId={site.id} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Experiments</h2>
        <SiteSnippet siteId={site.id} apiKey={site.apiKey} />
        <ExperimentList siteId={site.id} />
      </div>
    </div>
  )
}
