import { readFileSync } from "node:fs";

export interface Seed {
  siteId: string;
  siteKey: string;
  experimentKey: string;
}

export function readSeed(): Seed {
  try {
    return JSON.parse(readFileSync(new URL("../.perf-seed.json", import.meta.url), "utf-8")) as Seed;
  } catch {
    throw new Error("No .perf-seed.json found — run `pnpm seed` first.");
  }
}
