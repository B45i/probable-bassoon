import { defineConfig } from "@hey-api/openapi-ts";

// Generated from the control-plane Worker only (Tracking, Config, Results). Assignment
// has no generated client: its only consumer is the hand-written browser snippet
// (packages/snippet), which can't afford this client's weight or the react-query
// dependency it carries for consumers that want it — the snippet sits on the
// page-render critical path, this client never does.
//
// Reads the spec from the running dev server rather than a checked-in file, so it can
// never drift from what the Worker actually serves: `pnpm --filter @ab-tester/control-plane dev`
// must be up on :8787 before running `generate`.
export default defineConfig({
  input: "http://localhost:8787/openapi.json",
  output: "./src/client",
  plugins: ["@hey-api/client-axios", "@tanstack/react-query"],
});
