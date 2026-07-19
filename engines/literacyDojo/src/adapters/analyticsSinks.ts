import type { AnalyticsPayload, AnalyticsSink } from "../application/ports";

/**
 * Adapter inicial do plano: não envia nada a lugar nenhum. Um adapter real só
 * entra quando houver política de dados e eventos aprovados — sempre sem texto
 * livre do usuário (evidence-contract).
 */
export class NoopAnalyticsSink implements AnalyticsSink {
  track(_event: string, _payload?: AnalyticsPayload): void {
    // intencionalmente vazio
  }
}

/** Coleta eventos em memória — usado em testes. */
export class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: { event: string; payload?: AnalyticsPayload }[] = [];

  track(event: string, payload?: AnalyticsPayload): void {
    this.events.push({ event, payload });
  }
}
