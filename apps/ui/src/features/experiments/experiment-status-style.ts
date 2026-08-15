import { IconArchive, IconPencil, IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react"
import type { ComponentType } from "react"

export type ExperimentStatus = "draft" | "running" | "paused" | "archived"

/** One definition of what a status looks like, used everywhere a status renders — the
 * card grid, the results page header — so "running" can't end up green in one place and
 * unstyled text in another. */
export const EXPERIMENT_STATUS_STYLE: Record<
  ExperimentStatus,
  { icon: ComponentType<{ className?: string }>; colorClass: string; label: string }
> = {
  running: { icon: IconPlayerPlayFilled, colorClass: "text-chart-1", label: "Running" },
  paused: { icon: IconPlayerPauseFilled, colorClass: "text-amber-500", label: "Paused" },
  draft: { icon: IconPencil, colorClass: "text-muted-foreground", label: "Draft" },
  archived: { icon: IconArchive, colorClass: "text-muted-foreground", label: "Archived" },
}
