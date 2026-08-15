import { getV1SitesBySiteIdExperimentsByKeyResultsOptions, getV1SitesBySiteIdExperimentsOptions } from "@ab-tester/api-client"
import { useQuery } from "@tanstack/react-query"
import { parseAsString, useQueryState } from "nuqs"
import { useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { ExperimentStatusAction } from "./experiment-status-action"
import { ResultsTable } from "./results-table"

// The goal to report on is view state, not app state — it belongs in the URL (so a
// results link with a goal already on it is shareable) rather than in a query/atom.
const GOAL_PARAM = "goal"

export function ExperimentResultsPage() {
  const { siteId, key } = useParams<{ siteId: string; key: string }>()
  const [goal, setGoal] = useQueryState(GOAL_PARAM, parseAsString.withDefault(""))

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium">{key}</h1>
        {experiment && (
          <ExperimentStatusAction siteId={siteId} experimentKey={key} status={experiment.status} />
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="goal">Conversion goal</Label>
          <Input
            id="goal"
            placeholder="signup"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => results.refetch()}
          disabled={!goal}
        >
          Load results
        </Button>
      </div>

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
