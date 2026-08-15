import type { GetV1SitesBySiteIdExperimentsResponse } from "@ab-tester/api-client"
import { IconCalendar, IconGitBranch, IconPercentage } from "@tabler/icons-react"
import { Link } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { initials } from "@/lib/initials"
import { experimentResultsPath } from "@/routes"

import { ExperimentStatusAction } from "./experiment-status-action"
import { EXPERIMENT_STATUS_STYLE } from "./experiment-status-style"

type Experiment = GetV1SitesBySiteIdExperimentsResponse[number]

export function ExperimentCard({ siteId, experiment }: { siteId: string; experiment: Experiment }) {
  const { icon: StatusIcon, colorClass, label } = EXPERIMENT_STATUS_STYLE[experiment.status]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials(experiment.key)}</AvatarFallback>
          </Avatar>
          <CardTitle>
            <Link to={experimentResultsPath(siteId, experiment.key)} className="hover:underline">
              {experiment.key}
            </Link>
          </CardTitle>
        </div>
        <CardAction>
          <span className={`flex items-center gap-1 text-xs font-semibold tracking-widest uppercase ${colorClass}`}>
            <StatusIcon className="size-3.5" />
            {label}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <IconGitBranch className="size-3.5 shrink-0" />
          {experiment.variants.length} variants
        </span>
        <span className="flex items-center gap-1.5">
          <IconPercentage className="size-3.5 shrink-0" />
          {experiment.trafficBp / 100}% traffic
        </span>
        <span className="flex items-center gap-1.5">
          <IconCalendar className="size-3.5 shrink-0" />
          Created {new Date(experiment.createdAt).toLocaleDateString()}
        </span>
      </CardContent>
      <CardFooter>
        <ExperimentStatusAction siteId={siteId} experimentKey={experiment.key} status={experiment.status} />
      </CardFooter>
    </Card>
  )
}
