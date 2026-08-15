import type { GetV1SitesResponse } from "@ab-tester/api-client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CreateExperimentDialog } from "../experiments/create-experiment-dialog"

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
          <Card>
            <CardHeader>
              <CardTitle>{site.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <code className="text-xs text-muted-foreground">
                {site.apiKey}
              </code>
              <CreateExperimentDialog siteId={site.id} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
