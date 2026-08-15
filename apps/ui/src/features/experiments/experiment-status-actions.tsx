import { postV1SitesBySiteIdExperimentsByKeyStatusMutation } from "@ab-tester/api-client"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"

/**
 * There's no GET for a single experiment (see apps/control-plane's routes/experiments)
 * to know its current status up front, so these are two standing commands rather than a
 * toggle reflecting one — each just reports the status the API confirmed back after the
 * most recent click.
 */
export function ExperimentStatusActions({
  siteId,
  experimentKey,
}: {
  siteId: string
  experimentKey: string
}) {
  const setStatus = useMutation(
    postV1SitesBySiteIdExperimentsByKeyStatusMutation()
  )

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={setStatus.isPending}
        onClick={() =>
          setStatus.mutate({
            path: { siteId, key: experimentKey },
            body: { status: "running" },
          })
        }
      >
        Start
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={setStatus.isPending}
        onClick={() =>
          setStatus.mutate({
            path: { siteId, key: experimentKey },
            body: { status: "paused" },
          })
        }
      >
        Pause
      </Button>
      {setStatus.isSuccess && (
        <span className="text-sm text-muted-foreground">
          Now {setStatus.data.status}.
        </span>
      )}
      {setStatus.isError && (
        <span className="text-sm text-destructive">
          {setStatus.error.response?.data.error ?? "Couldn't update status."}
        </span>
      )}
    </div>
  )
}
