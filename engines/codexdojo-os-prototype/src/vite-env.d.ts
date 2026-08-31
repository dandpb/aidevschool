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
  // Mission runtime overrides, keyed by runtime.environmentKey in
  // config/mission-bindings.yaml. Set by .env.production to the bundled
  // dist/apps/ paths; unset in dev so the dev-server entrypoints apply.
  readonly VITE_WAREHOUSE_URL?: string
  readonly VITE_WORMHOLE_URL?: string
  readonly VITE_RELAY_STATION_URL?: string
  readonly VITE_PIPELINE_PLANT_URL?: string
  readonly VITE_CHECKPOINT_CITY_URL?: string
  readonly VITE_TIMELINE_TOWER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
