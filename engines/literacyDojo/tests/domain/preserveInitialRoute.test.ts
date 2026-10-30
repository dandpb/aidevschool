import { describe, expect, it } from "vitest";
import { lessons, modules } from "../../src/data/generated/lessons";
import {
  completeLesson,
  createInitialProgress,
  recordMapInitialAttempt,
  recordMapInitialHintRequest,
  recordMapInitialRetry,
} from "../../src/domain/progress";
import { emptyXpLedger } from "../../src/domain/xpLedger";

const lesson = lessons.find((item) => item.id === "l02");
if (!lesson) throw new Error("lição ausente");
const now = new Date("2026-07-19T12:00:00.000Z");
const scores = Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));

describe("rota inicial após conclusão", () => {
  it("não reescreve marcadores nem rota decidida em replay", () => {
    const progress = createInitialProgress(modules, "test");
    progress.onboarding = {
      completed: true,
      route: "intermediate",
      mapInitial: { attempts: 1, firstAttemptPassed: true, hintRequested: false, retried: false },
    };
    progress.lessonStatus.l02 = "completed";
    progress.lessonStatus.l01 = "locked";
    const before = structuredClone(progress.onboarding.mapInitial);
    if (!before) throw new Error("marcadores ausentes");
    const practiced = recordMapInitialRetry(
      recordMapInitialHintRequest(recordMapInitialAttempt(progress, { pass: false })),
    );
    expect(practiced.onboarding.mapInitial).toEqual(before);
    // A prior version may already have contaminated markers; the persisted route remains authoritative.
    practiced.onboarding.mapInitial = { ...before, hintRequested: true };
    const result = completeLesson(practiced, emptyXpLedger(), lesson!, scores, modules, now);
    expect(result.progress.onboarding.route).toBe("intermediate");
    expect(result.progress.lessonStatus.l01).toBe("locked");
  });
  it("mantém rota guiada já salva e não inventa rota em legado sem decisão", () => {
    const progress = createInitialProgress(modules, "test");
    progress.onboarding = { completed: true, route: "guided" };
    progress.lessonStatus.l02 = "completed";
    progress.lessonStatus.l01 = "available";
    const guided = completeLesson(progress, emptyXpLedger(), lesson!, scores, modules, now);
    expect(guided.progress.onboarding.route).toBe("guided");
    const legacy = { ...progress, onboarding: { completed: true } };
    const result = completeLesson(legacy, emptyXpLedger(), lesson!, scores, modules, now);
    expect(result.progress.onboarding.route).toBeUndefined();
  });
  it("primeira conclusão sem ajuda mantém a rota intermediária", () => {
    const progress = createInitialProgress(modules, "test");
    progress.onboarding = { completed: true };
    progress.lessonStatus.l02 = "in_progress";
    progress.lessonStatus.l01 = "locked";
    const attempted = recordMapInitialAttempt(progress, { pass: true });
    const result = completeLesson(attempted, emptyXpLedger(), lesson!, scores, modules, now);
    expect(result.progress.onboarding.route).toBe("intermediate");
    expect(result.progress.lessonStatus.l01).toBe("locked");
  });
  it("conclusão insuficiente não altera a rota", () => {
    const progress = createInitialProgress(modules, "test");
    progress.onboarding = { completed: true, route: "intermediate" };
    progress.lessonStatus.l02 = "completed";
    const result = completeLesson(progress, emptyXpLedger(), lesson!, {}, modules, now);
    expect(result.outcome.completed).toBe(false);
    expect(result.progress.onboarding.route).toBe("intermediate");
  });
  it("primeira conclusão continua usando dicas para decidir a rota guiada", () => {
    const progress = createInitialProgress(modules, "test");
    progress.onboarding = { completed: true };
    progress.lessonStatus.l02 = "in_progress";
    const attempted = recordMapInitialHintRequest(
      recordMapInitialAttempt(progress, { pass: true }),
    );
    const result = completeLesson(attempted, emptyXpLedger(), lesson!, scores, modules, now);
    expect(result.progress.onboarding.route).toBe("guided");
    expect(result.progress.lessonStatus.l01).toBe("available");
  });
});
