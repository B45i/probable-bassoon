import {
  getV1SitesBySiteIdExperimentsByKeyOptions,
  getV1SitesBySiteIdExperimentsByKeyResultsOptions,
  getV1SitesOptions,
} from "@ab-tester/api-client"
import {
  IconArrowLeft,
  IconCalendar,
  IconGitBranch,
  IconPercentage,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { initials } from "@/lib/initials"
import { sitePath } from "@/routes"

import { EmbedSnippet } from "./embed-snippet"
import { ExperimentStatusAction } from "./experiment-status-action"
import { EXPERIMENT_STATUS_STYLE } from "./experiment-status-style"
import { ResultsCards } from "./results-cards"

// Experiment keys are enforced lowercase-hyphenated slugs (see
// create-experiment-dialog.tsx), not space-separated names — split on hyphens too, so
// "homepage-hero" reads as two words ("HH") the same way a real name would, instead of
// falling back to its first two raw characters ("HO").
const KEY_SEGMENT_PATTERN = /[-\s]+/

export function ExperimentResultsPage() {
  const { siteId, key } = useParams<{ siteId: string; key: string }>()

  const sites = useQuery({ ...getV1SitesOptions(), enabled: Boolean(siteId) })
  const site = sites.data?.find((s) => s.id === siteId)

  const experimentQuery = useQuery({
    ...getV1SitesBySiteIdExperimentsByKeyOptions({
      path: { siteId: siteId ?? "", key: key ?? "" },
    }),
    enabled: Boolean(siteId && key),
  })
  const experiment = experimentQuery.data

  // No `goal` param — it's an optional filter on the results endpoint, and this system
  // has no per-experiment goal to pass yet. Omitting it counts every conversion recorded
  // for the site, unfiltered.
  const results = useQuery({
    ...getV1SitesBySiteIdExperimentsByKeyResultsOptions({
      path: { siteId: siteId ?? "", key: key ?? "" },
    }),
    enabled: Boolean(siteId && key),
  })

  if (!siteId || !key) return null

  const status = experiment && EXPERIMENT_STATUS_STYLE[experiment.status]

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        to={sitePath(siteId)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Back to site
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>
                {initials(key, KEY_SEGMENT_PATTERN)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{key}</h1>
                {status && (
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold tracking-widest uppercase ${status.colorClass}`}
                  >
                    <status.icon className="size-3.5" />
                    {status.label}
                  </span>
                )}
              </div>
              {experiment && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                    Created{" "}
                    {new Date(experiment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          {experiment && (
            <ExperimentStatusAction
              siteId={siteId}
              experimentKey={key}
              status={experiment.status}
            />
          )}
        </CardContent>
      </Card>

      {site && <EmbedSnippet siteKey={site.apiKey} experimentKey={key} />}

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {results.isPending && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {results.isError && (
            <p className="text-sm text-destructive">Couldn't load results.</p>
          )}
          {results.data && <ResultsCards results={results.data} />}
        </CardContent>
      </Card>
    </div>
  )
}
