import { getV1SitesBySiteIdExperimentsOptions } from "@ab-tester/api-client"
import { useQuery } from "@tanstack/react-query"

/** Same query key as experiment-list.tsx's, so navigating from this count to the site
 * detail page that renders the full list is served from cache, not a second fetch. */
export function ExperimentCount({ siteId }: { siteId: string }) {
  const experiments = useQuery(getV1SitesBySiteIdExperimentsOptions({ path: { siteId } }))
  const count = experiments.data?.length ?? 0

  return (
    <span className="text-xs text-muted-foreground">
      {count} {count === 1 ? "experiment" : "experiments"}
    </span>
  )
}
