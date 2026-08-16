import type { GetV1SitesBySiteIdExperimentsByKeyResultsResponse } from "@ab-tester/api-client"
import {
  IconArrowsHorizontal,
  IconCircleCheckFilled,
  IconClock,
  IconEye,
  IconFlag,
  IconMinus,
  IconPercentage,
  IconTargetArrow,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type Results = GetV1SitesBySiteIdExperimentsByKeyResultsResponse
type VariantResult = Results["variants"][number]

// Mirrors apps/control-plane's routes/results/handlers.ts MIN_SAMPLE_SIZE — not part of
// the API response, so this is the one place that has to stay in sync with it by hand.
// Below it, `significant` reads `false` for the same reason a well-sampled non-winner
// does; without this, the two look identical.
const MIN_SAMPLE_SIZE = 100

// One shared template for both the header labels and every data row, so a "Hamish
// Berry" row and a "b" row still line up column-for-column instead of each row sizing
// itself to its own content.
const ROW_GRID =
  "grid grid-cols-[minmax(11rem,1.4fr)_minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(6rem,1fr)_minmax(9rem,1fr)_minmax(6rem,1fr)_minmax(8rem,1fr)] items-center gap-4"

const percent = (rate: number) => `${(rate * 100).toFixed(2)}%`

function significance(
  variant: VariantResult,
  control: VariantResult | undefined
): {
  label: string
  icon: ComponentType<{ className?: string }>
  colorClass: string
} {
  if (variant.isControl)
    return {
      label: "Baseline",
      icon: IconFlag,
      colorClass: "text-muted-foreground",
    }
  const hasEnoughData =
    (control?.exposures ?? 0) >= MIN_SAMPLE_SIZE &&
    variant.exposures >= MIN_SAMPLE_SIZE
  if (!hasEnoughData)
    return {
      label: "Not enough data",
      icon: IconClock,
      colorClass: "text-muted-foreground",
    }
  return variant.significant
    ? {
        label: "Significant",
        icon: IconCircleCheckFilled,
        colorClass: "text-chart-1",
      }
    : {
        label: "Not significant",
        icon: IconMinus,
        colorClass: "text-muted-foreground",
      }
}

// Icon color is a scan aid, not a signal — each column gets a fixed color so the eye
// can jump straight to "which column is that" down the list, the way the app-wide
// status icons already use color for the same purpose. Lift and significance are the
// exception: their color is the signal itself (good/bad/neutral), computed per row.
function StatCell({
  icon: Icon,
  value,
  colorClass = "text-muted-foreground",
}: {
  icon: ComponentType<{ className?: string }>
  value: string
  colorClass?: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold">
      <Icon className={cn("size-4 shrink-0", colorClass)} />
      {value}
    </span>
  )
}

export function ResultsCards({ results }: { results: Results }) {
  const control = results.variants.find((variant) => variant.isControl)

  return (
    <div className="flex flex-col gap-4">
      {results.srm.detected && (
        <p className="text-sm text-destructive">
          Sample ratio mismatch detected — traffic isn't splitting the way it's
          configured to. Treat these numbers as unreliable until that's fixed.
        </p>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          <div
            className={cn(
              ROW_GRID,
              "px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            )}
          >
            <span>Variant</span>
            <span>Exposures</span>
            <span>Conversions</span>
            <span>Rate</span>
            <span>95% CI</span>
            <span>Lift</span>
            <span>Significance</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {results.variants.map((variant) => {
              const sig = significance(variant, control)
              const liftIcon =
                variant.lift === null || variant.lift === 0
                  ? IconMinus
                  : variant.lift > 0
                    ? IconTrendingUp
                    : IconTrendingDown
              const liftColorClass =
                variant.lift === null || variant.lift === 0
                  ? "text-muted-foreground"
                  : variant.lift > 0
                    ? "text-chart-1"
                    : "text-destructive"

              return (
                <div
                  key={variant.key}
                  className={cn(ROW_GRID, "px-1 py-3 first:pt-0 last:pb-0")}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(variant.key)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{variant.key}</span>
                  </div>

                  <StatCell
                    icon={IconEye}
                    value={String(variant.exposures)}
                    colorClass="text-chart-2"
                  />
                  <StatCell
                    icon={IconTargetArrow}
                    value={String(variant.conversions)}
                    colorClass="text-chart-1"
                  />
                  <StatCell
                    icon={IconPercentage}
                    value={percent(variant.rate)}
                    colorClass="text-chart-3"
                  />
                  <StatCell
                    icon={IconArrowsHorizontal}
                    value={`${percent(variant.confidenceInterval.lower)}–${percent(variant.confidenceInterval.upper)}`}
                    colorClass="text-chart-4"
                  />
                  <StatCell
                    icon={liftIcon}
                    value={variant.lift === null ? "—" : percent(variant.lift)}
                    colorClass={liftColorClass}
                  />

                  <Badge className={cn("w-fit", sig.colorClass)}>
                    <sig.icon className="size-3" />
                    {sig.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
