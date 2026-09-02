/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Endpoint NDJSON do sink de analytics do literacyDojo (ADR-0009). A
   * declaração de tipo NÃO habilita nada: nenhuma superfície de build deste
   * repo define este valor — ativar o transporte é decisão do board
   * (ADR-0010 §4). Sem o env, o sink composto é noop em produção e console
   * em dev.
   */
  readonly VITE_ANALYTICS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
