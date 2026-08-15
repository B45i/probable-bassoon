import { defineConfig } from "tsup";

export default defineConfig({
  entry: { snippet: "src/index.ts" },
  format: ["iife"],
  globalName: "ABTester",
  minify: true,
  sourcemap: true,
  clean: true,
});
