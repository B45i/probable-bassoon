import { users, type Database, type NewUser } from "@ab-tester/db";
import { eq } from "drizzle-orm";
import { signAuthToken } from "../../lib/auth/jwt";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import type { ErrorBody } from "../../lib/http";
import type { AuthenticatedUser } from "../../types";
import type { AuthTokenResponse, UserResponse } from "./schemas";

/**
 * Plain functions, no Hono `Context` — each one takes exactly the inputs it needs and
 * returns a `{ status, body }` pair matching the route's declared OpenAPI responses.
 * Unit-testable by calling them directly; index.ts is the only layer that knows Hono
 * exists.
 */

interface SignupInput {
  db: Database;
  email: string;
  password: string;
}
type SignupResult = { status: 201; body: UserResponse } | { status: 409; body: ErrorBody };

export async function signup({ db, email, password }: SignupInput): Promise<SignupResult> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return { status: 409, body: { error: "Email already registered" } };
  }

  const newUser: NewUser = { email, passwordHash: await hashPassword(password), createdAt: new Date() };
  const [created] = await db.insert(users).values(newUser).returning();
  if (!created) {
    // Only reachable via a race with another signup for the same email between the
    // check above and this insert — the unique constraint on users.email is what
    // actually prevents the duplicate; this is just turning that into a clean 409
    // instead of a thrown D1 error.
    return { status: 409, body: { error: "Email already registered" } };
  }

  return {
    status: 201,
    body: { id: created.id, email: created.email, createdAt: created.createdAt.toISOString() },
  };
}

interface LoginInput {
  db: Database;
  email: string;
  password: string;
  jwtSecret: string;
}
type LoginResult = { status: 200; body: AuthTokenResponse } | { status: 401; body: ErrorBody };

export async function login({ db, email, password, jwtSecret }: LoginInput): Promise<LoginResult> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same response whether the email doesn't exist or the password is wrong — either
  // branch leaking would tell a caller which emails are registered.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { status: 401, body: { error: "Invalid email or password" } };
  }

  // No session row to create — the token itself is the credential from here on.
  const { token, expiresAt } = await signAuthToken(user, jwtSecret);
  return { status: 200, body: { token, expiresAt: expiresAt.toISOString() } };
}

/** Straight from the verified token's claims — no D1 read. Means a changed email
 * wouldn't show here until the next login/token; there's no email-change feature yet,
 * so that's not a live problem, just the honest cost of a stateless token. */
export function me(user: AuthenticatedUser): { status: 200; body: AuthenticatedUser } {
  return { status: 200, body: user };
}
