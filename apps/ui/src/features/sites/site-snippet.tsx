import { getV1SitesBySiteIdExperimentsOptions } from "@ab-tester/api-client"
import { IconCode } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CopyTextButton } from "./copy-text-button"

/** Same query key as experiment-list.tsx's — no extra fetch on top of what the page
 * already loads. */
export function SiteSnippet({ siteId, apiKey }: { siteId: string; apiKey: string }) {
  const experiments = useQuery(getV1SitesBySiteIdExperimentsOptions({ path: { siteId } }))
  const experimentKeys = experiments.data?.map((experiment) => experiment.key).join(",") ?? ""

  // Matches packages/snippet/src/index.ts's documented embed exactly — this is the tag
  // a customer pastes into their own site, not something invented for display here.
  const snippet = `<script async src="${import.meta.env.VITE_ASSIGNMENT_URL}/snippet.js"\n        data-site-key="${apiKey}" data-experiments="${experimentKeys}"></script>`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCode className="size-4 text-muted-foreground" />
          Embed snippet
        </CardTitle>
        <CardAction>
          <CopyTextButton text={snippet} label="Snippet" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto border bg-muted/40 p-3 text-xs text-muted-foreground">
          <code>{snippet}</code>
        </pre>
        {!experimentKeys && (
          <p className="mt-2 text-xs text-muted-foreground">
            Add an experiment to fill in <code>data-experiments</code>.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
