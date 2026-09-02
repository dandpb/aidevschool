import type { LessonStatus } from "./progress";

/**
 * Avisos de retrofit (onda O3-C1, spec AID-644 rev 2 §3): lições que ganharam
 * atividades novas numa onda de conteúdo, para learners que já as haviam
 * concluído. Superfície mínima de UI — nada aqui altera gates, score,
 * evidência ou o predicado de conclusão.
 *
 * `RETROFITTED_LESSONS_BY_CONTENT_VERSION` registra, por `contentVersion` do
 * catálogo, as lições cujo diff da onda incluiu atividades novas. O gatilho do
 * aviso é derivado em runtime: lição da onda + status persistido "completed".
 * Idempotência: exatamente 1× por learner/lição/bump de `contentVersion`, com
 * ack estruturado (lessonId → contentVersion) persistido localmente — nunca
 * texto livre (storage.policy).
 */
export const RETROFITTED_LESSONS_BY_CONTENT_VERSION: Record<string, readonly string[]> = {
  "2026-09-02.3": ["l01", "l02", "l03", "l04", "l05", "l06", "l07"],
};

/** S1 — linha adicional do card "Revisão pendente" do Home (spec §3, verbatim). */
export const RETROFIT_NOTICE_S1 =
  "Esta lição ganhou atividades novas — sua conclusão continua valendo.";

/** S2 — intro da lição retrofitada, primeira execução pós-bump (spec §3, verbatim). */
export const RETROFIT_NOTICE_S2 =
  "Esta lição agora tem atividades novas. O que você já concluiu continua valendo.";

/** Acks do aviso de retrofit: lessonId → contentVersion em que o aviso foi exibido. */
export type RetrofitAcks = Record<string, string>;

export function isRetrofittedLesson(lessonId: string, contentVersion: string): boolean {
  return (RETROFITTED_LESSONS_BY_CONTENT_VERSION[contentVersion] ?? []).includes(lessonId);
}

export function isRetrofitNoticeDue(input: {
  lessonId: string;
  contentVersion: string;
  lessonStatus: Record<string, LessonStatus>;
  acks: RetrofitAcks;
}): boolean {
  return (
    isRetrofittedLesson(input.lessonId, input.contentVersion) &&
    input.lessonStatus[input.lessonId] === "completed" &&
    input.acks[input.lessonId] !== input.contentVersion
  );
}
