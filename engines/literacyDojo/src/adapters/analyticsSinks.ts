import type { AnalyticsSink } from "../application/ports";
import { isValidAnalyticsEvent } from "../domain/analytics";

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
 * NDJSON-over-HTTP: uma linha JSON por evento via fetch keepalive,
 * fire-and-forget. Erros de rede são engolidos (analytics nunca afeta a
 * experiência de aprendizagem). Só é ativado quando um endpoint é
 * explicitamente configurado.
 */
export function httpNdjsonAnalyticsSink(endpoint: string): AnalyticsSink {
  return {
    track(event): void {
      if (!isValidAnalyticsEvent(event)) return;
      try {
        void fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-ndjson" },
          body: `${JSON.stringify(event)}\n`,
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // fire-and-forget: nunca propagar
      }
    },
  };
}

/** Seleciona o sink pelo endpoint configurado (import.meta.env). */
export function analyticsSinkFromEnv(endpoint: string | undefined, isDev: boolean): AnalyticsSink {
  if (endpoint && endpoint.trim().length > 0) {
    return httpNdjsonAnalyticsSink(endpoint.trim());
  }
  return isDev ? consoleAnalyticsSink : noopAnalyticsSink;
}
