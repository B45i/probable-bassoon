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
import { parseAsString, useQueryState } from "nuqs"
import { type SyntheticEvent, useState } from "react"
import { Link, useParams } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { initials } from "@/lib/initials"
import { sitePath } from "@/routes"

import { EmbedSnippet } from "./embed-snippet"
import { ExperimentStatusAction } from "./experiment-status-action"
import { EXPERIMENT_STATUS_STYLE } from "./experiment-status-style"
import { getRecentGoals, rememberGoal } from "./recent-goals"
import { ResultsTable } from "./results-table"

// The goal to report on is view state, not app state — it belongs in the URL (so a
// results link with a goal already on it is shareable) rather than in a query/atom.
const GOAL_PARAM = "goal"
const RECENT_GOALS_LIST_ID = "recent-goals"

// Experiment keys are enforced lowercase-hyphenated slugs (see
// create-experiment-dialog.tsx), not space-separated names — split on hyphens too, so
// "homepage-hero" reads as two words ("HH") the same way a real name would, instead of
// falling back to its first two raw characters ("HO").
const KEY_SEGMENT_PATTERN = /[-\s]+/

export function ExperimentResultsPage() {
  const { siteId, key } = useParams<{ siteId: string; key: string }>()
  const [goal, setGoal] = useQueryState(
    GOAL_PARAM,
    parseAsString.withDefault("")
  )
  const [recentGoals] = useState(getRecentGoals)

  const sites = useQuery({ ...getV1SitesOptions(), enabled: Boolean(siteId) })
  const site = sites.data?.find((s) => s.id === siteId)

  const experimentQuery = useQuery({
    ...getV1SitesBySiteIdExperimentsByKeyOptions({
      path: { siteId: siteId ?? "", key: key ?? "" },
    }),
    enabled: Boolean(siteId && key),
  })
  const experiment = experimentQuery.data

  const results = useQuery({
    ...getV1SitesBySiteIdExperimentsByKeyResultsOptions({
      path: { siteId: siteId ?? "", key: key ?? "" },
      query: { goal },
    }),
    enabled: Boolean(siteId && key && goal),
  })

  if (!siteId || !key) return null

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    rememberGoal(goal)
    void results.refetch()
  }

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
          <CardAction>
            <form className="flex items-end gap-2" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="goal"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Conversion goal
                </Label>
                <Input
                  id="goal"
                  placeholder="signup"
                  list={RECENT_GOALS_LIST_ID}
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="h-9"
                />
                <datalist id={RECENT_GOALS_LIST_ID}>
                  {recentGoals.map((recentGoal) => (
                    <option key={recentGoal} value={recentGoal} />
                  ))}
                </datalist>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={!goal}
              >
                Load results
              </Button>
            </form>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!goal && (
            <p className="text-sm text-muted-foreground">
              Enter a conversion goal above to see results.
            </p>
          )}
          {results.isPending && goal && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {results.isError && (
            <p className="text-sm text-destructive">Couldn't load results.</p>
          )}
          {results.data && <ResultsTable results={results.data} />}
        </CardContent>
      </Card>
    </div>
  )
}
