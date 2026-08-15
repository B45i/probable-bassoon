import { defineConfig } from "vitest/config";

// happy-dom, not the Workers pool: this package runs in the browser, not a Worker —
// `document`/`navigator`/`crypto` are what need simulating here, not KV/D1/DO bindings.
export default defineConfig({
  test: {
    environment: "happy-dom",
  },
});
