import { postV1AuthLoginMutation } from "@ab-tester/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useSetAtom } from "jotai"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ROUTES } from "@/routes"

import { authTokenAtom } from "./auth-store"
import { type Credentials, credentialsSchema } from "./credentials-schema"

export function LoginPage() {
  const navigate = useNavigate()
  const setToken = useSetAtom(authTokenAtom)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) })

  const login = useMutation(postV1AuthLoginMutation())

  const onSubmit = handleSubmit((credentials) => {
    login.mutate(
      { body: credentials },
      {
        onSuccess: (response) => {
          setToken(response.token)
          navigate(ROUTES.sites)
        },
      }
    )
  })

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
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
            {login.isError && (
              <p className="text-sm text-destructive">
                {login.error.response?.data.error ?? "Something went wrong."}
              </p>
            )}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            No account?{" "}
            <Link to={ROUTES.signup} className="underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
