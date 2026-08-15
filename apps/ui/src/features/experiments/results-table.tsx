import type { GetV1SitesBySiteIdExperimentsByKeyResultsResponse } from "@ab-tester/api-client"

type Results = GetV1SitesBySiteIdExperimentsByKeyResultsResponse
type VariantResult = Results["variants"][number]

// Mirrors apps/control-plane's routes/results/handlers.ts MIN_SAMPLE_SIZE — not part of
// the API response, so this is the one place that has to stay in sync with it by hand.
// Below it, `significant` reads `false` for the same reason a well-sampled non-winner
// does; without this, the two look identical.
const MIN_SAMPLE_SIZE = 100

const percent = (rate: number) => `${(rate * 100).toFixed(2)}%`

function significanceLabel(variant: VariantResult, control: VariantResult | undefined): string {
  if (variant.isControl) return "Baseline"
  const hasEnoughData = (control?.exposures ?? 0) >= MIN_SAMPLE_SIZE && variant.exposures >= MIN_SAMPLE_SIZE
  if (!hasEnoughData) return "Not enough data"
  return variant.significant ? "Significant" : "Not significant"
}

export function ResultsTable({ results }: { results: Results }) {
  const control = results.variants.find((variant) => variant.isControl)

  return (
    <div className="flex flex-col gap-3">
      {results.srm.detected && (
        <p className="text-sm text-destructive">
          Sample ratio mismatch detected — traffic isn't splitting the way it's
          configured to. Treat these numbers as unreliable until that's fixed.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-normal">Variant</th>
              <th className="py-2 pr-4 font-normal">Exposures</th>
              <th className="py-2 pr-4 font-normal">Conversions</th>
              <th className="py-2 pr-4 font-normal">Rate</th>
              <th className="py-2 pr-4 font-normal">95% confidence interval</th>
              <th className="py-2 pr-4 font-normal">Lift</th>
              <th className="py-2 font-normal">Significance</th>
            </tr>
          </thead>
          <tbody>
            {results.variants.map((variant) => (
              <tr key={variant.key} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  {variant.key}
                  {variant.isControl && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (control)
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">{variant.exposures}</td>
                <td className="py-2 pr-4">{variant.conversions}</td>
                <td className="py-2 pr-4">{percent(variant.rate)}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {percent(variant.confidenceInterval.lower)}–{percent(variant.confidenceInterval.upper)}
                </td>
                <td className="py-2 pr-4">
                  {variant.lift === null ? "—" : percent(variant.lift)}
                </td>
                <td className="py-2">{significanceLabel(variant, control)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
