import { expect, it } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { createInitialProgress, reviewsDue, upcomingReviews } from "../../src/domain/progress";
import { parseReviewTimestamp } from "../../src/domain/reviewTimestamp";

it("compara instantes equivalentes e ordena datas com offsets", () => {
  const progress = createInitialProgress(modules, "v1");
  const skill = (skillId: string, nextReviewAt: string) => ({
    skillId,
    nextReviewAt,
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2026-10-29T12:00:00Z",
  });
  progress.skills = {
    entender: skill("entender", "2026-10-30T12:01:00Z"),
    avaliar: skill("avaliar", "2026-10-30T09:02:00-03:00"),
    pedir: skill("pedir", "2026-10-30T12:01:30.000Z"),
    decidir: skill("decidir", "inválida"),
  };
  const before = JSON.stringify(progress.skills);
  expect(
    reviewsDue(progress, new Date("2026-10-30T12:01:00.050Z")).map((item) => item.skillId),
  ).toEqual(["entender"]);
  expect(
    upcomingReviews(progress, new Date("2026-10-30T12:01:00.050Z")).map((item) => item.skillId),
  ).toEqual(["pedir", "avaliar"]);
  expect(JSON.stringify(progress.skills)).toBe(before);
});

it("rejeita datas impossíveis, sem fuso e strings que Date.parse aceita por acaso", () => {
  for (const value of [
    "0",
    "2026-02-31T12:00:00Z",
    "2026-10-30T25:00:00Z",
    "2026-10-30T12:00:00",
    "2026-10-30T12:00:00+24:00",
  ]) {
    expect(parseReviewTimestamp(value)).toBeNull();
  }
  expect(parseReviewTimestamp("2026-10-30T15:01:00+03:00")).toBe(
    parseReviewTimestamp("2026-10-30T12:01:00Z"),
  );
});
