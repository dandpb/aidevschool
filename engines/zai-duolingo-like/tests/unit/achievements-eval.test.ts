// Unit tests for the pure achievement evaluator.

import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_MAP,
  evaluateAchievements,
} from "@/lib/achievements";
import type { AchievementEvalContext } from "@/lib/achievements";

const fresh: AchievementEvalContext = {
  completedLessons: 0,
  totalLessons: 0,
  completedModuleSlugs: [],
  streakCurrent: 0,
  hasThreeStars: false,
  league: "bronze",
  hasUsedPlayground: false,
  hasOnboarded: false,
};

describe("evaluateAchievements", () => {
  it("awards nothing on a completely fresh context", () => {
    expect(evaluateAchievements(fresh)).toEqual([]);
  });

  it("awards onboarding and first-lesson badges", () => {
    expect(evaluateAchievements({ ...fresh, hasOnboarded: true })).toEqual([
      "compilador-iniciante",
    ]);
    expect(
      evaluateAchievements({ ...fresh, completedLessons: 1, totalLessons: 12 })
    ).toContain("primeiro-passo");
  });

  it("maps completed module slugs to their badges", () => {
    const cases: [string, string][] = [
      ["o-que-e-ia", "modulo-padroes"],
      ["dominando-o-chat", "modulo-prompts"],
      ["o-lado-negro", "modulo-riscos"],
      ["imagens-e-criatividade", "modulo-imagens"],
      ["esquadrao-de-agentes", "modulo-agentes"],
    ];
    for (const [slug, expected] of cases) {
      expect(
        evaluateAchievements({ ...fresh, completedModuleSlugs: [slug] })
      ).toContain(expected);
    }
  });

  it("awards mestre-protocolo only when every lesson is complete (and guards totalLessons 0)", () => {
    expect(
      evaluateAchievements({ ...fresh, completedLessons: 12, totalLessons: 12 })
    ).toContain("mestre-protocolo");
    expect(
      evaluateAchievements({ ...fresh, completedLessons: 0, totalLessons: 0 })
    ).not.toContain("mestre-protocolo");
    expect(
      evaluateAchievements({ ...fresh, completedLessons: 11, totalLessons: 12 })
    ).not.toContain("mestre-protocolo");
  });

  it("awards streak badges at 3 and 7", () => {
    expect(evaluateAchievements({ ...fresh, streakCurrent: 3 })).toContain("ofensiva-3");
    expect(evaluateAchievements({ ...fresh, streakCurrent: 6 })).not.toContain("ofensiva-7");
    expect(evaluateAchievements({ ...fresh, streakCurrent: 7 })).toContain("ofensiva-7");
  });

  it("awards explorer badges", () => {
    expect(evaluateAchievements({ ...fresh, hasThreeStars: true })).toContain("estrela-perfeita");
    expect(evaluateAchievements({ ...fresh, hasUsedPlayground: true })).toContain(
      "explorador-playground"
    );
  });

  it("awards liga-prata from silver up, but not bronze", () => {
    expect(evaluateAchievements({ ...fresh, league: "bronze" })).not.toContain("liga-prata");
    for (const league of ["silver", "gold", "platinum", "diamond"]) {
      expect(evaluateAchievements({ ...fresh, league })).toContain("liga-prata");
    }
  });

  it("only returns slugs that exist in ACHIEVEMENT_MAP", () => {
    const everything: AchievementEvalContext = {
      completedLessons: 12,
      totalLessons: 12,
      completedModuleSlugs: [
        "o-que-e-ia",
        "dominando-o-chat",
        "o-lado-negro",
        "imagens-e-criatividade",
        "ia-na-pratica",
        "por-dentro-da-maquina",
        "contexto-e-specs",
        "esquadrao-de-agentes",
        "o-protocolo-final",
      ],
      streakCurrent: 100,
      hasThreeStars: true,
      league: "diamond",
      hasUsedPlayground: true,
      hasOnboarded: true,
    };
    for (const slug of evaluateAchievements(everything)) {
      expect(ACHIEVEMENT_MAP[slug], `unknown slug ${slug}`).toBeDefined();
    }
  });
});
