import { defineConfig } from "vitest/config";

// Plain Node, not @cloudflare/vitest-pool-workers — everything in this package is a pure
// function with no Workers bindings to simulate.
export default defineConfig({});
