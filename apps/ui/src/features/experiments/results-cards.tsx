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
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type Results = GetV1SitesBySiteIdExperimentsByKeyResultsResponse
type VariantResult = Results["variants"][number]

// Mirrors apps/control-plane's routes/results/handlers.ts MIN_SAMPLE_SIZE — not part of
// the API response, so this is the one place that has to stay in sync with it by hand.
// Below it, `significant` reads `false` for the same reason a well-sampled non-winner
// does; without this, the two look identical.
const MIN_SAMPLE_SIZE = 100

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

function Stat({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className={cn("text-base font-semibold", valueClassName)}>
        {value}
      </span>
    </div>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Card key={variant.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials(variant.key)}</AvatarFallback>
                  </Avatar>
                  <CardTitle>{variant.key}</CardTitle>
                </div>
                <CardAction>
                  <Badge className={sig.colorClass}>
                    <sig.icon className="size-3" />
                    {sig.label}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat
                  icon={IconEye}
                  label="Exposures"
                  value={String(variant.exposures)}
                />
                <Stat
                  icon={IconTargetArrow}
                  label="Conversions"
                  value={String(variant.conversions)}
                />
                <Stat
                  icon={IconPercentage}
                  label="Rate"
                  value={percent(variant.rate)}
                />
                <Stat
                  icon={IconArrowsHorizontal}
                  label="95% confidence interval"
                  value={`${percent(variant.confidenceInterval.lower)}–${percent(variant.confidenceInterval.upper)}`}
                />
                {!variant.isControl && (
                  <Stat
                    icon={liftIcon}
                    label="Lift vs. control"
                    value={variant.lift === null ? "—" : percent(variant.lift)}
                    valueClassName={liftColorClass}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
