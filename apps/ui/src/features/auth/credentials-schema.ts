import { z } from "zod"

// Mirrors apps/control-plane's routes/auth/schemas.ts credentialsBodySchema — shared by
// login and signup here the same way it is there.
export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
})
export type Credentials = z.infer<typeof credentialsSchema>
