import { defineConfig } from "tsup";

export default defineConfig({
  entry: { snippet: "src/index.ts" },
  format: ["iife"],
  globalName: "ABTester",
  minify: true,
  sourcemap: true,
  clean: true,
  // Baked in at build time, not read from a data-* attribute on the embed tag: every
  // customer of one deployment shares the same tracking backend, so this is a
  // platform-level build constant, not per-customer configuration — the same reasoning
  // apps/ui's VITE_API_URL/VITE_ASSIGNMENT_URL already follow. See src/index.ts for why
  // this can't just reuse the script's own origin the way the assign call does.
  env: {
    TRACKING_ORIGIN: process.env.TRACKING_ORIGIN ?? "",
  },
});
