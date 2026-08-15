import {
  getV1SitesBySiteIdExperimentsQueryKey,
  postV1SitesBySiteIdExperimentsByKeyStatusMutation,
  type GetV1SitesBySiteIdExperimentsResponse,
} from "@ab-tester/api-client"
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"

type ExperimentStatus = GetV1SitesBySiteIdExperimentsResponse[number]["status"]

/**
 * Start and Pause are mutually exclusive — an experiment is never in a state where both
 * are valid next actions — so this is the one button that applies, not two where one is
 * always redundant.
 */
export function ExperimentStatusAction({
  siteId,
  experimentKey,
  status,
}: {
  siteId: string
  experimentKey: string
  status: ExperimentStatus
}) {
  const queryClient = useQueryClient()
  const setStatus = useMutation({
    ...postV1SitesBySiteIdExperimentsByKeyStatusMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getV1SitesBySiteIdExperimentsQueryKey({ path: { siteId } }),
      })
    },
  })

  const isRunning = status === "running"
  const nextStatus = isRunning ? "paused" : "running"

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={setStatus.isPending}
        onClick={() => setStatus.mutate({ path: { siteId, key: experimentKey }, body: { status: nextStatus } })}
      >
        {isRunning ? <IconPlayerPause /> : <IconPlayerPlay />}
        {isRunning ? "Pause" : "Start"}
      </Button>
      {setStatus.isError && (
        <span className="text-sm text-destructive">
          {setStatus.error.response?.data.error ?? "Couldn't update status."}
        </span>
      )}
    </div>
  )
}
