// Deliberately not @types/node: it and @cloudflare/workers-types both declare global
// fetch/Response/etc. with incompatible shapes, and this script (which imports src/app,
// needing the real Env global from ../src/env.d.ts) has to typecheck under workers types.
// Shimming just the one Node API this script actually uses avoids the conflict entirely.
declare module "node:fs" {
  export function writeFileSync(path: string | URL, data: string): void;
}

interface ImportMeta {
  url: string;
}
