import type { GetV1SitesBySiteIdExperimentsByKeyResultsResponse } from "@ab-tester/api-client"

type Results = GetV1SitesBySiteIdExperimentsByKeyResultsResponse

const percent = (rate: number) => `${(rate * 100).toFixed(2)}%`

export function ResultsTable({ results }: { results: Results }) {
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
              <th className="py-2 pr-4 font-normal">Lift</th>
              <th className="py-2 font-normal">Significant</th>
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
                <td className="py-2 pr-4">
                  {variant.lift === null ? "—" : percent(variant.lift)}
                </td>
                <td className="py-2">
                  {variant.significant === null
                    ? "—"
                    : variant.significant
                      ? "Yes"
                      : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
