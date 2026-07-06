declare module "node:fs" {
  export function mkdirSync(path: string, options?: { readonly recursive?: boolean }): void
  export function writeFileSync(path: string, data: string, encoding?: "utf8"): void
}

declare module "node:path" {
  export function dirname(path: string): string
  export function join(...paths: readonly string[]): string
}
