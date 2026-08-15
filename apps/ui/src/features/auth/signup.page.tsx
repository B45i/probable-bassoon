import { postV1AuthSignupMutation } from "@ab-tester/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ROUTES } from "@/routes"

import { type Credentials, credentialsSchema } from "./credentials-schema"

export function SignupPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) })

  const signup = useMutation(postV1AuthSignupMutation())

  const onSubmit = handleSubmit((credentials) => {
    // Signup doesn't return a token (see apps/control-plane's routes/auth/schemas.ts) —
    // log in separately on the next screen rather than guessing at a session here.
    signup.mutate({ body: credentials }, { onSuccess: () => navigate(ROUTES.login) })
  })

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" {...register("password")} />
              <FieldError errors={[errors.password]} />
            </Field>
            {signup.isError && (
              <p className="text-sm text-destructive">
                {signup.error.response?.data.error ?? "Something went wrong."}
              </p>
            )}
            <Button type="submit" disabled={signup.isPending}>
              {signup.isPending ? "Signing up…" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={ROUTES.login} className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
