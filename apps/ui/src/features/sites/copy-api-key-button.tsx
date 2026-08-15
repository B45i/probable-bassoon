import { IconCheck, IconCopy } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

export function CopyApiKeyButton({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    toast.add({ title: "API key copied", type: "success" })
  }

  return (
    <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopy}>
      {copied ? <IconCheck className="text-primary" /> : <IconCopy />}
      <span className="sr-only">Copy API key</span>
    </Button>
  )
}
