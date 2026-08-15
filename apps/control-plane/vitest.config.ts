import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Runs against real Workers runtime semantics (KV, D1, Durable Objects) via Miniflare,
// not mocks — the same bindings declared in wrangler.jsonc.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
});
