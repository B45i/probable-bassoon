import { getV1SitesBySiteIdExperimentsOptions } from "@ab-tester/api-client"
import { useQuery } from "@tanstack/react-query"

import { ExperimentCard } from "./experiment-card"

/** The only way back to an experiment once you've navigated away from the URL you
 * created it at — there's no other index of a site's experiments in this app. */
export function ExperimentList({ siteId }: { siteId: string }) {
  const experiments = useQuery(getV1SitesBySiteIdExperimentsOptions({ path: { siteId } }))

  if (experiments.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!experiments.data?.length) {
    return <p className="text-sm text-muted-foreground">No experiments yet — create one above.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {experiments.data.map((experiment) => (
        <ExperimentCard key={experiment.id} siteId={siteId} experiment={experiment} />
      ))}
    </div>
  )
}
