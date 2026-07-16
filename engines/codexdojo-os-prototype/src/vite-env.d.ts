/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEXDOJO_URL?: string
  readonly VITE_PIXELDOJO_URL?: string
  readonly VITE_VOXELDOJO_URL?: string
  readonly VITE_VOXELDOJO_URLS?: string
  readonly VITE_LOCAL_ENGINE_BRIDGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
