import { describe, expect, it } from "vitest";
import { contentVersion } from "../../src/data/generated/lessons";
import type { LessonStatus } from "../../src/domain/progress";
import {
  RETROFITTED_LESSONS_BY_CONTENT_VERSION,
  RETROFIT_NOTICE_S1,
  RETROFIT_NOTICE_S2,
  isRetrofitNoticeDue,
  isRetrofittedLesson,
} from "../../src/domain/retrofitNotice";

/**
 * Ondas de retrofit lançadas (contentVersion → lições retrofitadas):
 * - O3-C1 (spec AID-644 rev 2 §3): l01–l07 sob 2026-09-02.3.
 * - C1 (spec AID-807 §1 / ordem AID-806/B): l15–l17 sob 2026-09-04.1.
 */
const LAUNCHED_WAVES: Record<string, readonly string[]> = {
  "2026-09-02.3": ["l01", "l02", "l03", "l04", "l05", "l06", "l07"],
  "2026-09-04.1": ["l15", "l16", "l17"],
};

function statuses(completed: string[]): Record<string, LessonStatus> {
  return Object.fromEntries(completed.map((lessonId) => [lessonId, "completed" as const]));
}

describe("retrofitNotice (ondas O3-C1 + C1, specs AID-644 rev 2 §3 / AID-807 §1)", () => {
  it("mapa de ondas é exatamente o lançado e cobre o contentVersion vigente do catálogo", () => {
    // Garante que o mapa cobre o contentVersion gerado atual (barreira para ondas futuras).
    expect(RETROFITTED_LESSONS_BY_CONTENT_VERSION).toEqual(LAUNCHED_WAVES);
    expect(Object.keys(LAUNCHED_WAVES)).toContain(contentVersion);
  });

  it("isRetrofittedLesson: lição da onda no version do bump; onda vizinha ou versão outra, não", () => {
    for (const [version, waveLessons] of Object.entries(LAUNCHED_WAVES)) {
      const otherWave = Object.entries(LAUNCHED_WAVES)
        .filter(([v]) => v !== version)
        .flatMap(([, lessons]) => lessons);
      for (const lessonId of waveLessons) {
        expect(isRetrofittedLesson(lessonId, version), `${lessonId}@${version}`).toBe(true);
      }
      for (const lessonId of otherWave) {
        expect(isRetrofittedLesson(lessonId, version), `${lessonId}@${version}`).toBe(false);
      }
      expect(isRetrofittedLesson("l08", version)).toBe(false);
      expect(isRetrofittedLesson("l27", version)).toBe(false);
    }
    expect(isRetrofittedLesson("l01", "2026-09-02.2")).toBe(false);
    expect(isRetrofittedLesson("l15", "2026-09-02.3")).toBe(false);
    expect(isRetrofittedLesson("l01", "versao-desconhecida")).toBe(false);
  });

  it("aviso devido: lição da onda + status persistido completed + sem ack nesta versão", () => {
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: "2026-09-02.3",
        lessonStatus: statuses(["l01"]),
        acks: {},
      }),
    ).toBe(true);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l15",
        contentVersion: "2026-09-04.1",
        lessonStatus: statuses(["l15"]),
        acks: {},
      }),
    ).toBe(true);
  });

  it("não devido para lição não concluída (novo learner nunca vê o aviso de conclusão mantida)", () => {
    expect(
      isRetrofitNoticeDue({
        lessonId: "l15",
        contentVersion: "2026-09-04.1",
        lessonStatus: { l15: "in_progress" },
        acks: {},
      }),
    ).toBe(false);
  });

  it("idempotência: ack na MESMA versão suprime o aviso; bump futuro o rearma (A5)", () => {
    const lessonStatus = statuses(["l15"]);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l15",
        contentVersion: "2026-09-04.1",
        lessonStatus,
        acks: { l15: "2026-09-04.1" },
      }),
    ).toBe(false);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l15",
        contentVersion: "2026-09-04.1",
        lessonStatus,
        acks: { l15: "2026-09-02.3" },
      }),
    ).toBe(true);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l15",
        contentVersion: "2099-01-01.1",
        lessonStatus,
        acks: { l15: "2026-09-04.1" },
      }),
    ).toBe(false);
  });

  it("ack de outra lição não interfere (1× por learner/lição/bump)", () => {
    const lessonStatus = statuses(["l15", "l16"]);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l16",
        contentVersion: "2026-09-04.1",
        lessonStatus,
        acks: { l15: "2026-09-04.1" },
      }),
    ).toBe(true);
  });

  it("copy S1/S2 é a aprovada verbatim (sign-off UX AID-646) e respeita as constraints §3", () => {
    expect(RETROFIT_NOTICE_S1).toBe(
      "Esta lição ganhou atividades novas — sua conclusão continua valendo.",
    );
    expect(RETROFIT_NOTICE_S2).toBe(
      "Esta lição agora tem atividades novas. O que você já concluiu continua valendo.",
    );
    for (const text of [RETROFIT_NOTICE_S1, RETROFIT_NOTICE_S2]) {
      const sentences = text.split(/(?<=\.)\s/).filter((part) => part.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(2);
      expect(text).not.toMatch(/refazer/i);
      expect(text).not.toMatch(/culpa|erro seu|você errou/i);
    }
  });
});
