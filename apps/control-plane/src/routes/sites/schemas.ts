import { z } from "@hono/zod-openapi";

export const createSiteBodySchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateSiteBody = z.infer<typeof createSiteBodySchema>;

export const siteResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  ownerUserId: z.string(),
});
export type SiteResponse = z.infer<typeof siteResponseSchema>;
