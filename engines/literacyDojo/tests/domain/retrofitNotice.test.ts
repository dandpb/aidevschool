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

const WAVE_VERSIONS = Object.keys(RETROFITTED_LESSONS_BY_CONTENT_VERSION);

function statuses(completed: string[]): Record<string, LessonStatus> {
  return Object.fromEntries(completed.map((lessonId) => [lessonId, "completed" as const]));
}

describe("retrofitNotice (onda O3-C1, spec AID-644 rev 2 §3)", () => {
  it("mapa da onda cobre exatamente l01–l07 no contentVersion vigente do catálogo", () => {
    // Garante que o mapa cobre o contentVersion gerado atual (barreira para ondas futuras).
    expect(WAVE_VERSIONS).toContain(contentVersion);
    for (const version of WAVE_VERSIONS) {
      const lessons = RETROFITTED_LESSONS_BY_CONTENT_VERSION[version];
      expect([...lessons].sort()).toEqual(["l01", "l02", "l03", "l04", "l05", "l06", "l07"]);
    }
  });

  it("isRetrofittedLesson: lições da onda no version do bump; fora da onda ou de outra versão, não", () => {
    for (const version of WAVE_VERSIONS) {
      expect(isRetrofittedLesson("l01", version)).toBe(true);
      expect(isRetrofittedLesson("l07", version)).toBe(true);
      expect(isRetrofittedLesson("l08", version)).toBe(false);
      expect(isRetrofittedLesson("l27", version)).toBe(false);
    }
    expect(isRetrofittedLesson("l01", "2026-09-02.2")).toBe(false);
    expect(isRetrofittedLesson("l01", "versao-desconhecida")).toBe(false);
  });

  it("aviso devido: lição da onda + status persistido completed + sem ack nesta versão", () => {
    const [version] = WAVE_VERSIONS;
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: version,
        lessonStatus: statuses(["l01"]),
        acks: {},
      }),
    ).toBe(true);
  });

  it("não devido para lição não concluída (novo learner nunca vê o aviso de conclusão mantida)", () => {
    const [version] = WAVE_VERSIONS;
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: version,
        lessonStatus: { l01: "in_progress" },
        acks: {},
      }),
    ).toBe(false);
  });

  it("idempotência: ack na MESMA versão suprime o aviso; bump futuro o rearma (A5)", () => {
    const [version] = WAVE_VERSIONS;
    const lessonStatus = statuses(["l01"]);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: version,
        lessonStatus,
        acks: { l01: version },
      }),
    ).toBe(false);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: version,
        lessonStatus,
        acks: { l01: "2026-09-02.2" },
      }),
    ).toBe(true);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l01",
        contentVersion: "2099-01-01.1",
        lessonStatus,
        acks: { l01: version },
      }),
    ).toBe(false);
  });

  it("ack de outra lição não interfere (1× por learner/lição/bump)", () => {
    const [version] = WAVE_VERSIONS;
    const lessonStatus = statuses(["l01", "l02"]);
    expect(
      isRetrofitNoticeDue({
        lessonId: "l02",
        contentVersion: version,
        lessonStatus,
        acks: { l01: version },
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
