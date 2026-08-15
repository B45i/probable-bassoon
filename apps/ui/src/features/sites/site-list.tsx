import type { GetV1SitesResponse } from "@ab-tester/api-client"
import { IconKey, IconWorld } from "@tabler/icons-react"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CreateExperimentDialog } from "../experiments/create-experiment-dialog"
import { CopyApiKeyButton } from "./copy-api-key-button"

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
              <CardTitle className="flex items-center gap-2">
                <IconWorld className="size-4 text-muted-foreground" />
                {site.name}
              </CardTitle>
              <CardAction>
                <CreateExperimentDialog siteId={site.id} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex w-fit items-center gap-2 border bg-muted/40 py-1 pr-1 pl-2">
                <IconKey className="size-3.5 shrink-0 text-muted-foreground" />
                <code className="text-xs text-muted-foreground">{site.apiKey}</code>
                <CopyApiKeyButton apiKey={site.apiKey} />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
