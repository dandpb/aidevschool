import { describe, expect, it } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { createInitialProgress } from "../../src/domain/progress";
import {
  XpLedgerInvalidError,
  activityLedgerKey,
  awardEvaluationToLedger,
  buildCutoverLedger,
  canonicalJson,
  emptyXpLedger,
  fingerprintOf,
  isEligibleForEvaluationAward,
  isFirstCompletionAwarded,
  isValidLocalDateString,
  lessonLedgerKey,
  localDateKey,
  markFirstCompletionAwarded,
  validateXpLedger,
} from "../../src/domain/xpLedger";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const NEXT_DAY = new Date("2026-10-08T12:00:00.000Z");
const EARLIER_DAY = new Date("2026-10-06T12:00:00.000Z");

function progressWithCompleted(): ReturnType<typeof createInitialProgress> {
  const progress = createInitialProgress(modules, "test");
  const first = Object.keys(progress.lessonStatus)[0];
  if (first) progress.lessonStatus[first] = "completed";
  return progress;
}

describe("AID-3888 — elegibilidade de avaliação (P8: estritamente posterior)", () => {
  const key = activityLedgerKey("l02", "a1");

  it("nunca premiado é elegível", () => {
    expect(isEligibleForEvaluationAward(emptyXpLedger(), key, localDateKey(NOW))).toBe(true);
  });

  it("mesmo dia local NÃO é elegível (reload não reconcede)", () => {
    const ledger = awardEvaluationToLedger(emptyXpLedger(), key, localDateKey(NOW));
    expect(isEligibleForEvaluationAward(ledger, key, localDateKey(NOW))).toBe(false);
  });

  it("dia estritamente posterior é elegível 1×", () => {
    const ledger = awardEvaluationToLedger(emptyXpLedger(), key, localDateKey(NOW));
    expect(isEligibleForEvaluationAward(ledger, key, localDateKey(NEXT_DAY))).toBe(true);
  });

  it("relógio recuado (dia anterior ao premiado) NÃO reconcede — guard é '>', não '!=='", () => {
    const ledger = awardEvaluationToLedger(emptyXpLedger(), key, localDateKey(NOW));
    expect(isEligibleForEvaluationAward(ledger, key, localDateKey(EARLIER_DAY))).toBe(false);
  });

  it("alvos distintos são independentes (mesma lição, atividades diferentes)", () => {
    const other = activityLedgerKey("l02", "a2");
    const ledger = awardEvaluationToLedger(emptyXpLedger(), key, localDateKey(NOW));
    expect(isEligibleForEvaluationAward(ledger, other, localDateKey(NOW))).toBe(true);
  });
});

describe("AID-3888 — marcador permanente de primeira conclusão (P8)", () => {
  const key = lessonLedgerKey("l02");

  it("não premiado está livre; marcado fica permanente (sem repetição por review/replay)", () => {
    expect(isFirstCompletionAwarded(emptyXpLedger(), key)).toBe(false);
    const ledger = markFirstCompletionAwarded(emptyXpLedger(), key, localDateKey(NOW));
    expect(isFirstCompletionAwarded(ledger, key)).toBe(true);
    expect(isFirstCompletionAwarded(ledger, key)).toBe(true);
  });

  it("marcador ignora data — o bônus de 25 XP é 1× PARA SEMPRE por lição", () => {
    const ledger = markFirstCompletionAwarded(emptyXpLedger(), key, localDateKey(NOW));
    expect(isFirstCompletionAwarded(ledger, key)).toBe(true); // inclusive no dia seguinte
  });
});

describe("AID-3888 — corte (buildCutoverLedger): preserva sem recalcular", () => {
  it("completed legado semeia o marcador permanente; ledger diário nasce vazio", () => {
    const progress = progressWithCompleted();
    const ledger = buildCutoverLedger(progress, localDateKey(NOW));
    const completed = Object.entries(progress.lessonStatus).find(([, s]) => s === "completed");
    expect(completed).toBeDefined();
    expect(ledger.firstCompletionAwarded[lessonLedgerKey(completed![0])]).toBe(localDateKey(NOW));
    expect(ledger.lastAwardedDate).toEqual({});
  });

  it("completed legado bloqueia novo 25 XP mesmo com ledger vazio (decisão PO item 1)", () => {
    const ledger = buildCutoverLedger(progressWithCompleted(), localDateKey(NOW));
    const completed = Object.entries(progressWithCompleted().lessonStatus).find(
      ([, s]) => s === "completed",
    );
    expect(isFirstCompletionAwarded(ledger, lessonLedgerKey(completed![0]))).toBe(true);
  });

  it("o corte pode permitir a primeira avaliação elegível de 10 XP (ledger diário vazio)", () => {
    const ledger = buildCutoverLedger(progressWithCompleted(), localDateKey(NOW));
    const anyKey = activityLedgerKey("l02", "a1");
    expect(isEligibleForEvaluationAward(ledger, anyKey, localDateKey(NOW))).toBe(true);
  });
});

describe("AID-3888 — validação total do ledger (P1: rejeição integral)", () => {
  it("forma válida passa", () => {
    const ledger = awardEvaluationToLedger(
      emptyXpLedger(),
      activityLedgerKey("l02", "a1"),
      "2026-10-07",
    );
    expect(validateXpLedger(ledger)).toEqual(ledger);
  });

  it("ledgerVersion divergente rejeita (schema futuro não é cast)", () => {
    expect(() =>
      validateXpLedger({ ledgerVersion: 2, lastAwardedDate: {}, firstCompletionAwarded: {} }),
    ).toThrow(XpLedgerInvalidError);
  });

  it("ledger ausente/null é ERRO — não autorização para esvaziá-lo (decisão PO item 2)", () => {
    expect(() => validateXpLedger(null)).toThrow(XpLedgerInvalidError);
    expect(() => validateXpLedger(undefined)).toThrow(XpLedgerInvalidError);
    expect(() =>
      validateXpLedger({ ledgerVersion: 1, lastAwardedDate: null, firstCompletionAwarded: {} }),
    ).toThrow(/lastAwardedDate ausente\/null/);
  });

  it("gramática de chaves rejeita alvo malformado", () => {
    expect(() =>
      validateXpLedger({
        ledgerVersion: 1,
        lastAwardedDate: { "l02:a1": "2026-10-07" },
        firstCompletionAwarded: {},
      }),
    ).toThrow(/chave inválida/);
    expect(() =>
      validateXpLedger({
        ledgerVersion: 1,
        lastAwardedDate: {},
        firstCompletionAwarded: { activity: "2026-10-07" },
      }),
    ).toThrow(/chave inválida/);
  });

  it("datas malformadas rejeitadas (forma + calendário real)", () => {
    expect(() =>
      validateXpLedger({
        ledgerVersion: 1,
        lastAwardedDate: { "activity:l02:a1": "2026-13-01" },
        firstCompletionAwarded: {},
      }),
    ).toThrow(/data inválida/);
    expect(() =>
      validateXpLedger({
        ledgerVersion: 1,
        lastAwardedDate: { "activity:l02:a1": "2026-02-30" },
        firstCompletionAwarded: {},
      }),
    ).toThrow(/data inválida/);
    expect(isValidLocalDateString("2026-02-29")).toBe(false); // 2026 não é bissexto
    expect(isValidLocalDateString("2024-02-29")).toBe(true);
  });
});

describe("AID-3888 — projeção canônica e fingerprint (P12: sem promessa de bytes)", () => {
  it("projeção canônica é determinística na ordem das chaves", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("fingerprint igual para valores canonicamente iguais; diferente para mudança semântica", () => {
    expect(fingerprintOf({ a: 1, b: 2 })).toBe(fingerprintOf({ b: 2, a: 1 }));
    expect(fingerprintOf({ a: 1 })).not.toBe(fingerprintOf({ a: 2 }));
  });

  it("fingerprint estável entre execuções (detector declarado, não aleatório)", () => {
    expect(fingerprintOf({ x: "literal" })).toBe(fingerprintOf({ x: "literal" }));
  });
});
