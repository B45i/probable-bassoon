import { IconCode } from "@tabler/icons-react"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CopyTextButton } from "@/features/sites/copy-text-button"

/**
 * Matches packages/snippet/src/index.ts's documented embed exactly — this is the tag a
 * customer pastes into their own site, not something invented for display here. Lives
 * on the experiment's own page, scoped to just that one experiment's key: a customer
 * wires up whichever page of their site this specific experiment belongs on, not one
 * blanket tag listing every experiment across the whole site.
 */
export function EmbedSnippet({
  siteKey,
  experimentKey,
}: {
  siteKey: string
  experimentKey: string
}) {
  // One attribute per line — `data-experiments` can still get long with several keys in
  // a future multi-experiment embed, and that shouldn't force the whole tag onto one
  // unreadable line.
  const snippet = `<script async
  src="${import.meta.env.VITE_ASSIGNMENT_URL}/snippet.js"
  data-site-key="${siteKey}"
  data-experiments="${experimentKey}"
></script>`

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
        {/* Wraps instead of scrolling — this is meant to be read and copied, not
            scrolled through. */}
        <pre className="border bg-muted/40 p-3 text-xs break-all whitespace-pre-wrap text-muted-foreground">
          <code>{snippet}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
