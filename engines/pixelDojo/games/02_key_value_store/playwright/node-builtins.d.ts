// Minimal typings for the Node builtins used by the Playwright spec. The
// project deliberately ships the app without @types/node (browser code must
// never touch Node APIs); the spec runs under the Playwright Node runtime, so
// these narrow declarations keep `tsc --noEmit` strict without widening the
// app's type surface. (Mirrors the pixel-quest spec pattern.)
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
