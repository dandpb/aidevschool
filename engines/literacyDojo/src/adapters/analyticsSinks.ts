import type { AnalyticsSink } from "../application/ports";
import { isValidAnalyticsEvent } from "../domain/analytics";
import { createBatchAnalyticsSink } from "./analyticsBatchSink";

/**
 * Analytics sinks (ADR-0009). A fronteira de privacidade é inviolável: todo
 * evento é revalidado em runtime antes de sair — envelope inválido nunca é
 * enviado (é erro de programação detectado em teste/build). Nenhum sink lança
 * exceção: analytics nunca bloqueia a lição.
 */

/** Padrão sem backend configurado: os eventos morrem aqui. */
export const noopAnalyticsSink: AnalyticsSink = {
  track(): void {
    /* no-op deliberado: sem backend configurado, nada sai do dispositivo */
  },
};

/** Visibilidade em dev: loga o envelope validado. */
export const consoleAnalyticsSink: AnalyticsSink = {
  track(event): void {
    if (isValidAnalyticsEvent(event)) {
      console.info("[analytics]", event.event, event.props);
    }
  },
};

/**
 * Seleciona o sink pelo endpoint configurado (import.meta.env).
 *
 * Ativação O1 (AID-913, emenda ADR-0009/ADR-0010 §4): o endpoint definido em
 * build (`VITE_ANALYTICS_ENDPOINT`) ativa o batch sink same-origin — lotes
 * NDJSON/JSON para o coletor do próprio site. A única superfície autorizada
 * a definir o env são os `[build.environment]` dos netlify.toml do literacy
 * e do OS, sempre com o caminho same-origin `/__dojo/bridge/v1/analytics`
 * (invariantes travadas por teste). Sem o env, o sink é noop em produção e
 * console em dev; o sink nunca lança exceção.
 */
export function analyticsSinkFromEnv(endpoint: string | undefined, isDev: boolean): AnalyticsSink {
  if (endpoint && endpoint.trim().length > 0) {
    return createBatchAnalyticsSink({ endpoint: endpoint.trim() });
  }
  return isDev ? consoleAnalyticsSink : noopAnalyticsSink;
}

// Augmentation ambient de ImportMetaEnv (consolidada aqui, arquivo de
// fronteira que lê o env — AID-676; não criar arquivo `*env*.d.ts`, a regra
// guard-commands do repo trata paths `.env*`/`*env*` como credential-shaped).
// `tsconfig.app.json` já carrega `types: ["vite/client"]`.
declare global {
  interface ImportMetaEnv {
    /**
     * Rota same-origin do coletor de analytics (batch NDJSON) definida
     * APENAS nos `[build.environment]` de `engines/literacyDojo/netlify.toml`
     * e `engines/codexdojo-os-prototype/netlify.toml` (ativação O1 — ordem
     * AID-910/D / AID-913). O valor autorizado é exatamente
     * `/__dojo/bridge/v1/analytics`; qualquer outro valor em qualquer
     * superfície é drift travado por teste.
     */
    readonly VITE_ANALYTICS_ENDPOINT?: string;
  }
}
