import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import type { ProgressRepository } from "../../src/application/ports";
import { type ActivityDefinition, lessons, modules } from "../../src/data/generated/lessons";
import { createInitialProgress } from "../../src/domain/progress";
import { makeServices } from "../helpers";

/**
 * AID-1755/T3 — contrato de anúncio/refocus (padrão AID-1150) estendido a
 * Progress/Checkpoint/ErrorRecovery:
 *
 * - CheckpointScreen: a mudança de atividade move o foco para o h1 da nova
 *   instrução (tabIndex=-1, já existente) e o contador "Atividade N de M"
 *   vive num role="status" (aria-live polite) sr-only — o foco anuncia a
 *   instrução, o status anuncia o passo (semânticas separadas).
 * - ProgressScreen: o h1 é focável e recebe foco na montagem da tela (troca
 *   de rota SPA reposiciona a leitura em "Seu progresso"); status de backup
 *   segue em role=status/alert.
 * - ErrorRecoveryScreen: o h1 recebe foco na montagem (a tela de recuperação
 *   renderiza fora do .app-stage do efeito genérico de rota — sem refocus
 *   próprio, o foco caía no body) e a mensagem segue em role="alert".
 *
 * Mutations que quebram isso (sem refocus, sem tabIndex=-1, sem role="status"
 * do contador, sem role="alert") falham aqui.
 */

type User = ReturnType<typeof userEvent.setup>;

/** Repositório quebrado: boot falha e cai na ErrorRecoveryScreen. */
class BrokenProgressRepository implements ProgressRepository {
  async load(): Promise<never> {
    throw new Error("armazenamento local inacessível (teste)");
  }

  async save(): Promise<void> {
    throw new Error("armazenamento local inacessível (teste)");
  }

  async reset(): Promise<void> {
    throw new Error("armazenamento local inacessível (teste)");
  }
}

/** Responde a atividade do desafio corretamente pelo DOM (cp-01: sort, output_comparison, choice). */
async function answerRight(user: User, activity: ActivityDefinition) {
  if (activity.type === "sort") {
    const order = activity.data.items.map((item) => item.id);
    const expected = activity.evaluation.expectedOrder;
    for (const [index, target] of expected.entries()) {
      let position = order.indexOf(target);
      while (position > index) {
        await user.click(screen.getByTestId(`sort-up-${target}`));
        order.splice(position - 1, 0, order.splice(position, 1)[0]);
        position -= 1;
      }
    }
    return;
  }
  if (activity.type === "output_comparison") {
    await user.click(screen.getByTestId(`output-${activity.evaluation.betterOutputId}`));
    for (const criterionId of activity.evaluation.requiredCriterionIds) {
      await user.click(screen.getByTestId(`criterion-${criterionId}`));
    }
    return;
  }
  if (activity.type === "choice") {
    const correct = new Set(activity.evaluation.correctOptionIds);
    for (const option of activity.data.options) {
      if (!correct.has(option.id)) continue;
      await user.click(screen.getByTestId(`option-${option.id}`));
      if (!activity.data.multiSelect) return;
    }
    return;
  }
  throw new Error(`tipo sem helper de teste: ${activity.type}`);
}

function checkpointActivity(lessonId: string, activityId: string): ActivityDefinition {
  const lesson = lessons.find((entry) => entry.id === lessonId);
  const activity = lesson?.activities.find((item) => item.id === activityId);
  if (!activity) throw new Error(`atividade ausente do read model: ${lessonId}:${activityId}`);
  return activity;
}

function corridorProgress() {
  const progress = createInitialProgress(modules, "test-content-version");
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus.l01 = "completed";
  progress.lessonStatus.l02 = "completed";
  progress.lessonStatus.l03 = "completed";
  progress.currentLessonId = "l03";
  return progress;
}

describe("AID-1755/T3: refocus/anúncio em Progress/Checkpoint/ErrorRecovery", () => {
  it("Progress: h1 focável (tabIndex=-1) e focado ao entrar na tela", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: corridorProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("open-progress"));
    await screen.findByTestId("progress-screen");

    const h1 = screen.getByRole("heading", { name: "Seu progresso" });
    expect(h1).toHaveAttribute("id", "progress-title");
    expect(h1).toHaveAttribute("tabindex", "-1");
    expect(h1).toHaveFocus();
  });

  it("Checkpoint: transição de atividade foca o h1 e atualiza o status 'Atividade N de M'", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: corridorProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));
    await screen.findByTestId("checkpoint-intro");

    await user.click(screen.getByTestId("start-checkpoint"));
    await screen.findByTestId("checkpoint-player");

    // Atividade 1: h1 focado (instrução) + contador em live region (passo).
    const first = checkpointActivity("l01", "l01-a2");
    const h1First = screen.getByRole("heading");
    expect(h1First).toHaveFocus();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Atividade 1 de 3");

    await answerRight(user, first);
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");
    await user.click(screen.getByTestId("next-activity"));

    // Atividade 2: refocus no h1 da nova instrução + status atualizado.
    const second = checkpointActivity("l02", "l02-a1");
    const h1Second = screen.getByRole("heading", {
      name: second.instruction,
    });
    expect(h1Second).toHaveAttribute("id", "activity-heading");
    expect(h1Second).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Atividade 2 de 3");
  });

  it("ErrorRecovery: h1 focado na montagem e mensagem em role=alert", async () => {
    const { createTestServices, fixedClock } = await import("../fakes");
    const services = createTestServices({
      progressRepo: new BrokenProgressRepository(),
      clock: fixedClock(new Date("2026-07-19T12:00:00.000Z")),
    });
    render(<App services={services} />);

    await screen.findByTestId("error-recovery-screen");

    const h1 = screen.getByRole("heading", { name: "Não foi possível continuar" });
    expect(h1).toHaveAttribute("id", "error-title");
    expect(h1).toHaveAttribute("tabindex", "-1");
    expect(h1).toHaveFocus();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("armazenamento local inacessível (teste)");
  });
});
