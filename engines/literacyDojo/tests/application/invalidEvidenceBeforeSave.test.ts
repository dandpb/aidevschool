import { expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { EVIDENCE_TEXT_MAX_LENGTH, isValidEvidenceRecord } from "../../src/domain/evidence";
import type { LearnerProgress } from "../../src/domain/progress";
import { InMemoryProgressRepository } from "../fakes";
import { makeServices } from "../helpers";

it("não grava tentativa quando a resposta não cabe no contrato de evidência", async () => {
  const lesson = lessons.find((item) => item.id === "l05");
  const activity = lesson?.activities[0];
  if (!lesson || !activity || activity.type !== "prompt_builder")
    throw new Error("fixture ausente");
  const { services, stateStore } = makeServices();
  const save = vi.spyOn(stateStore, "saveState");
  const answer = {
    values: Object.fromEntries(activity.data.fields.map((field) => [field.id, "x"])),
  };
  answer.values[activity.data.fields[0].id] = "x".repeat(2001);
  await expect(
    services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer,
    }),
  ).rejects.toThrow(/LiteracyEvidenceRecord/);
  expect(save).not.toHaveBeenCalled();
});

it("mantém o limite da interface alinhado com a validação do schema", async () => {
  const { services } = makeServices();
  const result = await services.useCases.submitActivityAttempt({
    lessonId: "l05",
    activityId: "l05-a1",
    answer: { values: { objetivo: "x".repeat(EVIDENCE_TEXT_MAX_LENGTH) } },
  });
  expect(isValidEvidenceRecord(result.record)).toBe(true);
  expect(
    isValidEvidenceRecord({
      ...result.record,
      answer: { values: { objetivo: "x".repeat(EVIDENCE_TEXT_MAX_LENGTH + 1) } },
    }),
  ).toBe(false);
});

it("também rejeita antes de gravar no repositório legado separado", async () => {
  const { stateStore, initial } = makeServices();
  const progress = new InMemoryProgressRepository();
  progress.seed(initial);
  const save = vi.spyOn(progress, "save");
  const services = createServices({ stateStore, progressRepo: progress });
  await expect(
    services.useCases.submitActivityAttempt({
      lessonId: "l05",
      activityId: "l05-a1",
      answer: { values: { objetivo: "x".repeat(2001) } },
    }),
  ).rejects.toThrow(/LiteracyEvidenceRecord/);
  expect(save).not.toHaveBeenCalled();
});

it("mantém atividade, resposta e contexto originais durante leitura atrasada", async () => {
  const { services, stateStore } = makeServices();
  const originalRead = stateStore.readState.bind(stateStore);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(stateStore, "readState").mockImplementation(async () => {
    await gate;
    return originalRead();
  });
  const answer = {
    values: {
      objetivo: "avisar os clientes sobre a mudança",
      contexto: "mudança de horário da clínica no próximo mês",
      publico: "clientes da clínica",
      formato: "e-mail curto para clientes",
    },
  };
  const input: Parameters<typeof services.useCases.submitActivityAttempt>[0] = {
    lessonId: "l05",
    activityId: "l05-a1",
    answer,
    context: "initial",
  };
  const pending = services.useCases.submitActivityAttempt(input);
  answer.values.objetivo = "x".repeat(2001);
  input.activityId = "l05-a2";
  input.context = "review";
  release();
  const result = await pending;
  expect(result.record.activityId).toBe("l05-a1");
  expect(result.record.context).toBe("initial");
  expect(result.record.answer).toMatchObject({
    values: { objetivo: "avisar os clientes sobre a mudança" },
  });
  expect(stateStore.storedStateValue()?.xpLedger.lastAwardedDate).toHaveProperty(
    "activity:l05:l05-a1",
  );
  expect(stateStore.storedStateValue()?.xpLedger.lastAwardedDate).not.toHaveProperty(
    "activity:l05:l05-a2",
  );
});

it("mantém a resposta original enquanto o repositório legado aguarda leitura", async () => {
  const { stateStore, initial } = makeServices();
  const progress = new InMemoryProgressRepository();
  progress.seed(initial);
  const originalLoad = progress.load.bind(progress);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(progress, "load").mockImplementation(async () => {
    await gate;
    return originalLoad();
  });
  const services = createServices({ stateStore, progressRepo: progress });
  const answer = { values: { objetivo: "resposta original" } };
  const input: Parameters<typeof services.useCases.submitActivityAttempt>[0] = {
    lessonId: "l05",
    activityId: "l05-a1",
    answer,
    context: "initial",
  };
  const pending = services.useCases.submitActivityAttempt(input);
  answer.values.objetivo = "x".repeat(2001);
  input.activityId = "l05-a2";
  input.context = "review";
  release();
  const result = await pending;
  expect(result.record.activityId).toBe("l05-a1");
  expect(result.record.context).toBe("initial");
  expect(result.record.answer).toMatchObject({ values: { objetivo: "resposta original" } });
  expect(result.progress.counters.attempts).toBe(1);
});

it("valida antes do update legado e conserva a resposta durante callback atrasado", async () => {
  const { stateStore, initial } = makeServices();
  const base = new InMemoryProgressRepository();
  base.seed(initial);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const update = vi.fn(async (mutate: (current: LearnerProgress | null) => LearnerProgress) => {
    await gate;
    const next = mutate(await base.load());
    await base.save(next);
    return next;
  });
  const progress = Object.assign(base, { update });
  const services = createServices({ stateStore, progressRepo: progress });
  await expect(
    services.useCases.submitActivityAttempt({
      lessonId: "l05",
      activityId: "l05-a1",
      answer: { values: { objetivo: "x".repeat(2001) } },
    }),
  ).rejects.toThrow(/LiteracyEvidenceRecord/);
  expect(update).not.toHaveBeenCalled();
  const answer = { values: { objetivo: "resposta original" } };
  const input: Parameters<typeof services.useCases.submitActivityAttempt>[0] = {
    lessonId: "l05",
    activityId: "l05-a1",
    answer,
    context: "initial",
  };
  const pending = services.useCases.submitActivityAttempt(input);
  answer.values.objetivo = "x".repeat(2001);
  input.activityId = "l05-a2";
  input.context = "review";
  release();
  const result = await pending;
  expect(result.record.activityId).toBe("l05-a1");
  expect(result.record.context).toBe("initial");
  expect(result.record.answer).toMatchObject({ values: { objetivo: "resposta original" } });
  expect(update).toHaveBeenCalledOnce();
});
