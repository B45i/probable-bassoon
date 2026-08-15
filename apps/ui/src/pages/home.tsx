import { getHealthOptions } from "@ab-tester/api-client"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"

export function HomePage() {
  const health = useQuery(getHealthOptions())

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          control-plane:{" "}
          {health.isPending ? "checking…" : health.isError ? "unreachable" : "ok"}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}
