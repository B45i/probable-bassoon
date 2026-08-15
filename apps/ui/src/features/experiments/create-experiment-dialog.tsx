import { postV1SitesBySiteIdExperimentsMutation } from "@ab-tester/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconPlus } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { experimentResultsPath } from "@/routes"

// A fixed control/variant pair at an even split — enough to prove out create → run →
// results. Custom variant counts, weights, and per-variant content are real fields the
// API already supports; they just don't have inputs here yet.
const EVEN_SPLIT_BP = 5000

// Mirrors apps/control-plane's routes/experiments/schemas.ts createExperimentBodySchema,
// simplified to the fixed two-variant shape this dialog submits.
const createExperimentSchema = z.object({
  key: z.string().min(1).max(100),
  controlKey: z.string().min(1).max(100),
  variantKey: z.string().min(1).max(100),
})
type CreateExperimentInput = z.infer<typeof createExperimentSchema>

export function CreateExperimentDialog({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateExperimentInput>({
    resolver: zodResolver(createExperimentSchema),
    defaultValues: { controlKey: "control", variantKey: "variant-b" },
  })

  const createExperiment = useMutation(postV1SitesBySiteIdExperimentsMutation())

  const onSubmit = handleSubmit(({ key, controlKey, variantKey }) => {
    createExperiment.mutate(
      {
        path: { siteId },
        body: {
          key,
          variants: [
            { key: controlKey, weightBp: EVEN_SPLIT_BP, isControl: true, content: {} },
            { key: variantKey, weightBp: EVEN_SPLIT_BP, isControl: false, content: {} },
          ],
        },
      },
      {
        onSuccess: (experiment) => {
          setOpen(false)
          navigate(experimentResultsPath(experiment.siteId, experiment.key))
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <IconPlus />
        New experiment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New experiment</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field data-invalid={!!errors.key}>
            <FieldLabel htmlFor="experiment-key">Experiment key</FieldLabel>
            <Input id="experiment-key" placeholder="homepage-hero" {...register("key")} />
            <FieldError errors={[errors.key]} />
          </Field>
          <Field data-invalid={!!errors.controlKey}>
            <FieldLabel htmlFor="control-key">Control variant key</FieldLabel>
            <Input id="control-key" {...register("controlKey")} />
            <FieldError errors={[errors.controlKey]} />
          </Field>
          <Field data-invalid={!!errors.variantKey}>
            <FieldLabel htmlFor="variant-key">Challenger variant key</FieldLabel>
            <Input id="variant-key" {...register("variantKey")} />
            <FieldError errors={[errors.variantKey]} />
          </Field>
          {createExperiment.isError && (
            <p className="text-sm text-destructive">
              {createExperiment.error.response?.data.error ?? "Something went wrong."}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createExperiment.isPending}>
              {createExperiment.isPending ? "Creating…" : "Create experiment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
