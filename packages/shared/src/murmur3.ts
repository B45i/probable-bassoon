import murmurhash3js from "murmurhash3js";

/**
 * The bucketing hash: decides experiment inclusion and variant assignment for every
 * visitor, on every page load. It's the hottest function in the system, so it's isolated
 * behind this one-line wrapper instead of importing `murmurhash3js` directly wherever
 * it's needed — swapping the underlying implementation later only ever touches this file.
 *
 * Imported as a default import, not `import { x86 } from "murmurhash3js"`: the package is
 * CommonJS, and Node's own ESM loader only resolves a named import like `{ x86 }` through
 * best-effort static analysis of the CJS source, which doesn't reliably see through this
 * package's `module.exports = { x86, x64, ... }` object-literal style. A default import
 * always gets the whole `module.exports` object, so it works the same way everywhere this
 * runs — plain Node, Vite/vitest, and the esbuild-based bundling both wrangler and
 * vitest-pool-workers do — rather than only where the bundler happens to be lenient.
 */
export function murmur3(value: string, seed = 0): number {
  return murmurhash3js.x86.hash32(value, seed);
}
