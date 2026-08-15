import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { attachDb } from "../../lib/db";
import { BEARER_AUTH, errorResponseSpec, jsonContent, UNAUTHORIZED_RESPONSE } from "../../lib/http";
import { requireAuth } from "../../lib/auth/middleware";
import { AUTH_PATHS } from "../paths";
import type { AppEnv } from "../../types";
import * as handlers from "./handlers";
import { authTokenResponseSchema, credentialsBodySchema, userResponseSchema } from "./schemas";

const app = new OpenAPIHono<AppEnv>();
app.use("*", attachDb);

const signupRoute = createRoute({
  method: "post",
  path: AUTH_PATHS.signup,
  request: { body: { content: jsonContent(credentialsBodySchema) } },
  responses: {
    201: { description: "Account created", content: jsonContent(userResponseSchema) },
    409: errorResponseSpec("Email already registered"),
  },
});

app.openapi(signupRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const result = await handlers.signup({ db: c.get("db"), email, password });
  return result.status === 201 ? c.json(result.body, 201) : c.json(result.body, 409);
});

const loginRoute = createRoute({
  method: "post",
  path: AUTH_PATHS.login,
  request: { body: { content: jsonContent(credentialsBodySchema) } },
  responses: {
    200: { description: "Signed JWT for the admin API", content: jsonContent(authTokenResponseSchema) },
    401: errorResponseSpec("Invalid email or password"),
  },
});

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const result = await handlers.login({ db: c.get("db"), email, password, jwtSecret: c.env.JWT_SECRET });
  return result.status === 200 ? c.json(result.body, 200) : c.json(result.body, 401);
});

const meRoute = createRoute({
  method: "get",
  path: AUTH_PATHS.me,
  security: BEARER_AUTH,
  middleware: [requireAuth] as const,
  responses: {
    200: { description: "The authenticated user", content: jsonContent(userResponseSchema) },
    401: UNAUTHORIZED_RESPONSE,
  },
});

app.openapi(meRoute, (c) => {
  const result = handlers.me(c.get("user"));
  return c.json(result.body, 200);
});

export default app;
