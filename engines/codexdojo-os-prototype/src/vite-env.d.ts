/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEXDOJO_URL?: string
  readonly VITE_PIXELDOJO_URL?: string
  readonly VITE_LITERACYDOJO_URL?: string
  readonly VITE_MINITOWN_URL?: string
  readonly VITE_DOJOTODAY_URL?: string
  readonly VITE_VOXELDOJO_URL?: string
  readonly VITE_VOXELDOJO_URLS?: string
  readonly VITE_ZAI_DUOLINGO_URL?: string
  readonly VITE_LOCAL_ENGINE_BRIDGE?: string
  readonly VITE_ANALYTICS_ENDPOINT?: string
  readonly VITE_ENABLE_REACT_INSTRUMENTATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
