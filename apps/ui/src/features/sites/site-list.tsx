import type { GetV1SitesResponse } from "@ab-tester/api-client"
import { IconChevronRight, IconWorld } from "@tabler/icons-react"
import { Link } from "react-router"

import { Card, CardContent } from "@/components/ui/card"
import { sitePath } from "@/routes"

import { ExperimentCount } from "../experiments/experiment-count"

export function SiteList({ sites }: { sites: GetV1SitesResponse }) {
  if (sites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sites yet — create one above.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {sites.map((site) => (
        <li key={site.id}>
          <Link to={sitePath(site.id)} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconWorld className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{site.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ExperimentCount siteId={site.id} />
                  <IconChevronRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
