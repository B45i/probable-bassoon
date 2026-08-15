import { writeFileSync } from "node:fs";
import app from "../src/app";

// Walks the routes registered via app.openapi(...) and writes the spec straight to disk —
// no server needs to be running. packages/api-client generates its typed client from this
// file (turbo task: control-plane#openapi -> api-client#generate).
const document = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "AB Tester — Control Plane", version: "0.0.0" },
});

writeFileSync(new URL("../openapi.json", import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
