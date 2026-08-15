import type { GetV1SitesResponse } from "@ab-tester/api-client"
import { IconChevronRight } from "@tabler/icons-react"
import { Link } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { initials } from "@/lib/initials"
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
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials(site.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-base font-semibold">{site.name}</span>
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
