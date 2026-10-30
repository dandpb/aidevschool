import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import type { SkillPractice } from "../../src/domain/progress";
import { makeServices } from "../helpers";

const dueSkill = (skillId: string): SkillPractice => ({
  skillId,
  attempts: 1,
  passes: 1,
  lastScore: 1,
  lastPracticedAt: "2020-01-01T00:00:00.000Z",
  nextReviewAt: "2020-01-02T00:00:00.000Z",
});

function setup(
  active: "ia_pratica" | "dev" = "ia_pratica",
  options: { otherCompleted?: boolean; shared?: boolean } = {},
) {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l02 = "completed";
  initial.lessonStatus.l15 = options.otherCompleted === false ? "in_progress" : "completed";
  if (options.shared) initial.lessonStatus.l22 = "completed";
  initial.currentLessonId = active === "dev" ? "l15" : "l02";
  initial.journeys = { active };
  initial.skills = {
    decidir: dueSkill("decidir"),
    entender: dueSkill("entender"),
    desconhecida: dueSkill("desconhecida"),
    ...(options.shared ? { avaliar: dueSkill("avaliar") } : {}),
  };
  stateStore.seedProgress(initial);
  render(<App services={services} />);
  return services;
}

async function dueRow(title: string) {
  await userEvent.click(await screen.findByTestId("open-progress"));
  const list = screen.getByTestId("reviews-due");
  const row = within(list).getByText(title).closest<HTMLElement>("li");
  if (!row) throw new Error("revisão ausente");
  return row;
}

describe("orientação de revisão entre jornadas", () => {
  it("explica como alcançar revisão Dev e não promete caminho para habilidade sem lição concluída", async () => {
    const services = setup();
    const row = await dueRow(services.content.getSkillTitle("decidir"));
    expect(within(row).queryByRole("button", { name: "Revisar" })).toBeNull();
    expect(row).toHaveTextContent(/Jornada Dev/);
    expect(row).toHaveTextContent(/Volte ao início/);
    const list = screen.getByTestId("reviews-due");
    const orphan = within(list)
      .getByText(services.content.getSkillTitle("desconhecida"))
      .closest<HTMLElement>("li");
    expect(orphan).toHaveTextContent(/nenhuma lição concluída disponível/i);
    expect(screen.getByTestId("progress-review-l02")).toBeEnabled();
  });
  it("não promete a troca se a lição da outra jornada estiver em andamento", async () => {
    const services = setup("ia_pratica", { otherCompleted: false });
    const row = await dueRow(services.content.getSkillTitle("decidir"));
    expect(row).toHaveTextContent(/nenhuma lição concluída disponível/i);
    expect(row).not.toHaveTextContent(/Jornada Dev/);
  });
  it("mantém ação da jornada ativa quando a habilidade é compartilhada", async () => {
    const services = setup("ia_pratica", { shared: true });
    const row = await dueRow(services.content.getSkillTitle("avaliar"));
    expect(within(row).getByRole("button", { name: "Revisar" })).toBeEnabled();
    expect(row).not.toHaveTextContent(/volte ao início/i);
  });
  it("explica o caminho inverso para a Vila Lume", async () => {
    const services = setup("dev");
    const row = await dueRow(services.content.getSkillTitle("entender"));
    expect(row).toHaveTextContent(/Vila Lume/);
    expect(row).toHaveTextContent(/Volte ao início/);
    expect(screen.getByTestId("progress-review-l15")).toBeEnabled();
  });
});
