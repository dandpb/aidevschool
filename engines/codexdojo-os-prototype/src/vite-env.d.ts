/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEXDOJO_URL?: string
  readonly VITE_PIXELDOJO_URL?: string
  readonly VITE_VOXELDOJO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
