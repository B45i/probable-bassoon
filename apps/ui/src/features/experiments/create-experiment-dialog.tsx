import { getV1SitesBySiteIdExperimentsQueryKey, postV1SitesBySiteIdExperimentsMutation } from "@ab-tester/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { experimentResultsPath } from "@/routes"

/**
 * Shaped around what packages/shared/src/bucketing.ts actually does with this data: it
 * walks `variants` in the order they're stored, adding each one's `weightBp` to a
 * running total, and hands a visitor whichever variant their hash number falls under.
 * That only covers every visitor if the weights sum to exactly 100% — there's no
 * fallback range for the gap if they don't. The three checks below (2-20 variants,
 * unique names, splits summing to 100, exactly one control) are the same three the API
 * enforces server-side; this just catches them before a round trip.
 */
const MIN_VARIANTS = 2
const MAX_VARIANTS = 20

const variantSchema = z.object({
  key: z.string().min(1, "Required").max(100),
  headline: z.string().min(1, "Required").max(200),
  // Whole percent, not basis points — nobody typing a split thinks in units of 1/100th
  // of a percent. Converted to weightBp (what the API actually wants) on submit.
  splitPercent: z.number().int().min(0).max(100),
})

const createExperimentSchema = z.object({
  key: z.string().min(1).max(100),
  variants: z.array(variantSchema).min(MIN_VARIANTS).max(MAX_VARIANTS),
  controlIndex: z.number().int().min(0),
})
type CreateExperimentInput = z.infer<typeof createExperimentSchema>

function emptyVariant(): CreateExperimentInput["variants"][number] {
  return { key: "", headline: "", splitPercent: 0 }
}

export function CreateExperimentDialog({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CreateExperimentInput>({
    resolver: zodResolver(createExperimentSchema),
    // No pre-filled variant names — "control"/"challenger" only ever made sense as
    // labels for a fixed two-slot form. Once there can be any number of variants,
    // there's no default name that means anything; an even 50/50 starting split is the
    // one default that's still just a number, not a presumed identity.
    defaultValues: {
      key: "",
      variants: [
        { key: "", headline: "", splitPercent: 50 },
        { key: "", headline: "", splitPercent: 50 },
      ],
      controlIndex: 0,
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "variants" })
  const variants = useWatch({ control, name: "variants" })

  const totalSplit = variants.reduce((sum, v) => sum + (Number.isFinite(v.splitPercent) ? v.splitPercent : 0), 0)
  const splitIsValid = totalSplit === 100
  const nonEmptyNames = variants.map((v) => v.key).filter(Boolean)
  const hasDuplicateNames = new Set(nonEmptyNames).size !== nonEmptyNames.length

  function handleRemove(index: number): void {
    remove(index)
    // Removing an earlier row shifts every later row's index down by one — without
    // this, "control" could silently end up pointing at a different variant than the
    // one that was actually marked control before the removal.
    const currentControl = getValues("controlIndex")
    if (index === currentControl) {
      setValue("controlIndex", 0)
    } else if (index < currentControl) {
      setValue("controlIndex", currentControl - 1)
    }
  }

  const createExperiment = useMutation(postV1SitesBySiteIdExperimentsMutation())

  const onSubmit = handleSubmit((data) => {
    if (!splitIsValid || hasDuplicateNames) return
    createExperiment.mutate(
      {
        path: { siteId },
        body: {
          key: data.key,
          variants: data.variants.map((variant, index) => ({
            key: variant.key,
            weightBp: variant.splitPercent * 100,
            isControl: index === data.controlIndex,
            content: { headline: variant.headline },
          })),
        },
      },
      {
        onSuccess: (experiment) => {
          void queryClient.invalidateQueries({
            queryKey: getV1SitesBySiteIdExperimentsQueryKey({ path: { siteId } }),
          })
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New experiment</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field data-invalid={!!errors.key}>
            <FieldLabel htmlFor="experiment-key">Experiment name</FieldLabel>
            <Input id="experiment-key" placeholder="homepage-hero" {...register("key")} />
            <FieldError errors={[errors.key]} />
          </Field>

          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel>Variants</FieldLabel>
              <FieldDescription>
                Each visitor sees exactly one of these. Mark one as the control — the version that's already live —
                everything else gets compared against it.
              </FieldDescription>
            </div>

            <Controller
              name="controlIndex"
              control={control}
              render={({ field: controlField }) => (
                <RadioGroup
                  value={String(controlField.value)}
                  onValueChange={(value) => controlField.onChange(Number(value))}
                  className="gap-3"
                >
                  {fields.map((variantField, index) => {
                    const isControl = controlField.value === index
                    return (
                      <div
                        key={variantField.id}
                        className={cn(
                          "flex flex-col gap-3 rounded-md border p-4",
                          isControl && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Variant {index + 1}
                            {isControl && <span className="ml-2 text-xs text-primary">Control</span>}
                          </span>
                          {fields.length > MIN_VARIANTS && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remove variant ${index + 1}`}
                              onClick={() => handleRemove(index)}
                            >
                              <IconTrash />
                            </Button>
                          )}
                        </div>

                        <Field data-invalid={!!errors.variants?.[index]?.key}>
                          <FieldLabel htmlFor={`variant-name-${variantField.id}`}>Name</FieldLabel>
                          <Input
                            id={`variant-name-${variantField.id}`}
                            placeholder={index === 0 ? "e.g. original" : "e.g. bigger-button"}
                            {...register(`variants.${index}.key` as const)}
                          />
                          <FieldError errors={[errors.variants?.[index]?.key]} />
                        </Field>

                        <Field data-invalid={!!errors.variants?.[index]?.headline}>
                          <FieldLabel htmlFor={`variant-headline-${variantField.id}`}>
                            Headline shown to visitors
                          </FieldLabel>
                          <Input
                            id={`variant-headline-${variantField.id}`}
                            placeholder="Welcome back!"
                            {...register(`variants.${index}.headline` as const)}
                          />
                          <FieldError errors={[errors.variants?.[index]?.headline]} />
                        </Field>

                        <div className="flex items-end justify-between gap-4">
                          <Field data-invalid={!!errors.variants?.[index]?.splitPercent}>
                            <FieldLabel htmlFor={`variant-split-${variantField.id}`}>Traffic split</FieldLabel>
                            <div className="flex items-center gap-1.5">
                              <Input
                                id={`variant-split-${variantField.id}`}
                                type="number"
                                min={0}
                                max={100}
                                className="w-20"
                                {...register(`variants.${index}.splitPercent` as const, { valueAsNumber: true })}
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </Field>

                          <label
                            htmlFor={`control-${variantField.id}`}
                            className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm"
                          >
                            <RadioGroupItem value={String(index)} id={`control-${variantField.id}`} />
                            Use as control
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </RadioGroup>
              )}
            />

            <div className="flex items-center justify-between">
              <span className={cn("text-sm", splitIsValid ? "text-muted-foreground" : "text-destructive")}>
                Total traffic: {totalSplit}%{!splitIsValid && " — must add up to 100%"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fields.length >= MAX_VARIANTS}
                onClick={() => append(emptyVariant())}
              >
                <IconPlus />
                Add variant
              </Button>
            </div>
            {hasDuplicateNames && <p className="text-sm text-destructive">Variant names must be unique.</p>}
          </div>

          {createExperiment.isError && (
            <p className="text-sm text-destructive">
              {createExperiment.error.response?.data.error ?? "Something went wrong."}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createExperiment.isPending || !splitIsValid || hasDuplicateNames}>
              {createExperiment.isPending ? "Creating…" : "Create experiment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
