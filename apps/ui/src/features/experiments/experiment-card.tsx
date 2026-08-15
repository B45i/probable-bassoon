import type { GetV1SitesBySiteIdExperimentsResponse } from "@ab-tester/api-client"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { experimentResultsPath } from "@/routes"

import { ExperimentStatusAction } from "./experiment-status-action"

type Experiment = GetV1SitesBySiteIdExperimentsResponse[number]

const STATUS_BADGE_VARIANT: Record<Experiment["status"], "default" | "secondary" | "outline"> = {
  running: "default",
  paused: "secondary",
  draft: "outline",
  archived: "outline",
}

export function ExperimentCard({ siteId, experiment }: { siteId: string; experiment: Experiment }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link to={experimentResultsPath(siteId, experiment.key)} className="hover:underline">
            {experiment.key}
          </Link>
        </CardTitle>
        <CardAction>
          <Badge variant={STATUS_BADGE_VARIANT[experiment.status]}>{experiment.status}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>
          {experiment.variants.length} variants · {experiment.trafficBp / 100}% traffic
        </span>
        <span>Created {new Date(experiment.createdAt).toLocaleDateString()}</span>
      </CardContent>
      <CardFooter>
        <ExperimentStatusAction siteId={siteId} experimentKey={experiment.key} status={experiment.status} />
      </CardFooter>
    </Card>
  )
}
