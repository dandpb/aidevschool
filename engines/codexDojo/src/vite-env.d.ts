/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEXDOJO_OS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
