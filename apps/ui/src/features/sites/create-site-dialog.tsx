import { getV1SitesQueryKey, postV1SitesMutation } from "@ab-tester/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconPlus } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
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

// Mirrors apps/control-plane's routes/sites/schemas.ts createSiteBodySchema.
const createSiteSchema = z.object({ name: z.string().min(1).max(200) })
type CreateSiteInput = z.infer<typeof createSiteSchema>

export function CreateSiteDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSiteInput>({ resolver: zodResolver(createSiteSchema) })

  const createSite = useMutation({
    ...postV1SitesMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getV1SitesQueryKey() })
      reset()
      setOpen(false)
    },
  })

  const onSubmit = handleSubmit((input) => createSite.mutate({ body: input }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <IconPlus />
        New site
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New site</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="site-name">Name</FieldLabel>
            <Input id="site-name" placeholder="acme.com" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          {createSite.isError && (
            <p className="text-sm text-destructive">
              {createSite.error.response?.data.error ?? "Something went wrong."}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createSite.isPending}>
              {createSite.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
