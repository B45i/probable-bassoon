import { createDb, users, type NewUser } from "@ab-tester/db";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { signAuthToken } from "../lib/auth/jwt";
import { requireAuth } from "../lib/auth/middleware";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import type { AppEnv } from "../types";

const app = new OpenAPIHono<AppEnv>();

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: z.object({ error: z.string() }) } },
});

const credentialsBody = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

const userResponse = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.iso.datetime(),
});

const signupRoute = createRoute({
  method: "post",
  path: "/signup",
  request: { body: { content: { "application/json": { schema: credentialsBody } } } },
  responses: {
    201: { description: "Account created", content: { "application/json": { schema: userResponse } } },
    409: errorResponse("Email already registered"),
  },
});

app.openapi(signupRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const newUser: NewUser = {
    email,
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
  };
  const [created] = await db.insert(users).values(newUser).returning();
  if (!created) {
    return c.json({ error: "Email already registered" }, 409);
  }

  return c.json({ id: created.id, email: created.email, createdAt: created.createdAt.toISOString() }, 201);
});

const authTokenResponse = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
});

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  request: { body: { content: { "application/json": { schema: credentialsBody } } } },
  responses: {
    200: { description: "Signed JWT for the admin API", content: { "application/json": { schema: authTokenResponse } } },
    401: errorResponse("Invalid email or password"),
  },
});

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same response whether the email doesn't exist or the password is wrong — either
  // branch leaking would tell a caller which emails are registered.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // No session row to create (D8) — the token itself is the credential from here on.
  const { token, expiresAt } = await signAuthToken(user, c.env.JWT_SECRET);
  return c.json({ token, expiresAt: expiresAt.toISOString() }, 200);
});

const meRoute = createRoute({
  method: "get",
  path: "/me",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "The authenticated user", content: { "application/json": { schema: userResponse } } },
    401: errorResponse("Unauthorized"),
  },
});

app.use("/me", requireAuth);
app.openapi(meRoute, (c) => {
  // Straight from the verified token's claims (D8) — no D1 read. Means a changed email
  // wouldn't show here until the next login/token; there's no email-change feature yet,
  // so that's not a live problem, just the honest cost of a stateless token.
  return c.json(c.get("user"), 200);
});

export default app;
