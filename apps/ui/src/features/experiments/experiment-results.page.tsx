import { getV1SitesBySiteIdExperimentsByKeyResultsOptions, getV1SitesBySiteIdExperimentsOptions } from "@ab-tester/api-client"
import { IconArrowLeft } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { parseAsString, useQueryState } from "nuqs"
import { type SyntheticEvent, useState } from "react"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sitePath } from "@/routes"

import { EXPERIMENT_STATUS_STYLE } from "./experiment-status-style"
import { ExperimentStatusAction } from "./experiment-status-action"
import { getRecentGoals, rememberGoal } from "./recent-goals"
import { ResultsTable } from "./results-table"

// The goal to report on is view state, not app state — it belongs in the URL (so a
// results link with a goal already on it is shareable) rather than in a query/atom.
const GOAL_PARAM = "goal"
const RECENT_GOALS_LIST_ID = "recent-goals"

export function ExperimentResultsPage() {
  const { siteId, key } = useParams<{ siteId: string; key: string }>()
  const [goal, setGoal] = useQueryState(GOAL_PARAM, parseAsString.withDefault(""))
  const [recentGoals] = useState(getRecentGoals)

  const experiments = useQuery({
    ...getV1SitesBySiteIdExperimentsOptions({ path: { siteId: siteId ?? "" } }),
    enabled: Boolean(siteId),
  })
  const experiment = experiments.data?.find((e) => e.key === key)

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        to={sitePath(siteId)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Back to site
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">{key}</h1>
          {experiment && (
            <span
              className={`text-xs font-semibold tracking-widest uppercase ${EXPERIMENT_STATUS_STYLE[experiment.status].colorClass}`}
            >
              {EXPERIMENT_STATUS_STYLE[experiment.status].label}
            </span>
          )}
        </div>
        {experiment && (
          <ExperimentStatusAction siteId={siteId} experimentKey={key} status={experiment.status} />
        )}
      </div>

      <form className="flex items-end gap-2" onSubmit={handleSubmit}>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="goal">Conversion goal</Label>
          <Input
            id="goal"
            placeholder="signup"
            list={RECENT_GOALS_LIST_ID}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
          <datalist id={RECENT_GOALS_LIST_ID}>
            {recentGoals.map((recentGoal) => (
              <option key={recentGoal} value={recentGoal} />
            ))}
          </datalist>
        </div>
        <Button type="submit" variant="outline" disabled={!goal}>
          Load results
        </Button>
      </form>

      {results.isPending && goal && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {results.isError && (
        <p className="text-sm text-destructive">Couldn't load results.</p>
      )}
      {results.data && <ResultsTable results={results.data} />}
    </div>
  )
}
