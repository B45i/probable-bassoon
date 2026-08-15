import { defineConfig } from "@hey-api/openapi-ts";

// Generated from the control-plane Worker only (Tracking, Config, Results). Assignment
// has no generated client: its only consumer is the hand-written browser snippet
// (packages/snippet), which can't afford this client's weight or the react-query
// dependency it carries for consumers that want it — the snippet sits on the
// page-render critical path, this client never does.
export default defineConfig({
  input: "../../apps/control-plane/openapi.json",
  output: "./src/generated",
  plugins: ["@hey-api/client-fetch", "@tanstack/react-query"],
});
