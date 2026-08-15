import { z } from "@hono/zod-openapi";

export const credentialsBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});
export type CredentialsBody = z.infer<typeof credentialsBodySchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.iso.datetime(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

export const authTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
