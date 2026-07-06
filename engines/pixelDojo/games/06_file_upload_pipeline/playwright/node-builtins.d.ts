// Minimal typings for the Node builtins used by the Playwright spec. The
// project ships @types/node but the tsconfig restricts ambient types to
// ["vite/client"], so these narrow declarations keep `tsc --noEmit` strict
// without widening the app's browser type surface.
declare module "node:fs" {
  export function mkdirSync(path: string, options?: { readonly recursive?: boolean }): void
  export function writeFileSync(path: string, data: string, encoding?: "utf8"): void
}

declare module "node:path" {
  export function dirname(path: string): string
  export function join(...paths: readonly string[]): string
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string
}
