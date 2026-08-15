import { IconCheck, IconCopy } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

/** Generic copy-to-clipboard icon button — the site key and the embed snippet both need
 * one, and the only thing that differs between them is the text and the toast label. */
export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.add({ title: `${label} copied`, type: "success" })
  }

  return (
    <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopy}>
      {copied ? <IconCheck className="text-primary" /> : <IconCopy />}
      <span className="sr-only">Copy {label}</span>
    </Button>
  )
}
