import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import type { SkillPractice } from "../../src/domain/progress";
import { buildTrackQueries } from "../../src/domain/trackQueries";
import { makeServices } from "../helpers";

function skill(skillId: string, date: string): SkillPractice {
  return {
    skillId,
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2020-01-01T00:00:00.000Z",
    nextReviewAt: date,
  };
}
function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l02 = "completed";
  initial.lessonStatus.l03 = "available";
  initial.lessonStatus.l15 = "completed";
  initial.currentLessonId = "l03";
  initial.skills = {
    decidir: skill("decidir", "2020-01-01T00:00:00.000Z"),
    entender: skill("entender", "2026-07-19T00:00:00.000Z"),
  };
  stateStore.seedProgress(initial);
  return { services, initial };
}

describe("revisão da jornada ativa", () => {
  it("oferece a habilidade IA devida mesmo quando uma Dev aparece antes", async () => {
    const { services } = setup();
    const user = userEvent.setup();
    render(<App services={services} />);
    const review = await screen.findByTestId("review-button");
    expect(screen.getByTestId("hud-review-due")).toHaveTextContent("devida hoje");
    const card = review.closest<HTMLElement>(".card-review");
    if (!card) throw new Error("card ausente");
    expect(within(card).getByText(/Hora de revisar/)).toHaveTextContent(
      services.content.getSkillTitle("entender"),
    );
    expect(within(card).getByText(/Hora de revisar/)).not.toHaveTextContent(
      services.content.getSkillTitle("decidir"),
    );
    await user.click(review);
    expect(await screen.findByTestId("lesson-intro")).toHaveTextContent(
      "IA não é uma fonte de verdade",
    );
  });
  it("escolhe a habilidade elegível da jornada Dev na ordem inversa", () => {
    const { services, initial } = setup();
    initial.skills = { entender: initial.skills.entender, decidir: initial.skills.decidir };
    const query = buildTrackQueries(initial, services.content, services.clock, "dev");
    expect(query.reviewLesson?.id).toBe("l15");
    expect(query.reviewSkill?.skillId).toBe("decidir");
    expect(query.dueReviews).toHaveLength(2);
  });
  it("não oferece revisão se nenhuma lição elegível estiver concluída", () => {
    const { services, initial } = setup();
    initial.lessonStatus.l02 = "available";
    const query = buildTrackQueries(initial, services.content, services.clock, "ia_pratica");
    expect(query.reviewLesson).toBeUndefined();
    expect(query.reviewSkill).toBeUndefined();
  });
  it("seleciona skill compartilhada pela lição concluída na jornada ativa", () => {
    const { services, initial } = setup();
    initial.lessonStatus.l22 = "completed";
    initial.skills = { avaliar: skill("avaliar", "2020-01-01T00:00:00.000Z") };
    const ia = buildTrackQueries(initial, services.content, services.clock, "ia_pratica");
    const dev = buildTrackQueries(initial, services.content, services.clock, "dev");
    expect(ia.reviewLesson?.id).toBe("l02");
    expect(dev.reviewLesson?.id).toBe("l22");
    expect(ia.reviewSkill?.skillId).toBe("avaliar");
    expect(dev.reviewSkill?.skillId).toBe("avaliar");
  });
  it("ignora skill desconhecida devida e datas futuras ou ausentes ao escolher par", () => {
    const { services, initial } = setup();
    const absent = skill("decidir", "2020-01-01T00:00:00.000Z");
    absent.nextReviewAt = undefined;
    initial.skills = {
      desconhecida: skill("desconhecida", "2020-01-01T00:00:00.000Z"),
      futuro: skill("avaliar", "2030-01-01T00:00:00.000Z"),
      ausente: absent,
      entender: skill("entender", "2026-07-19T00:00:00.000Z"),
    };
    const query = buildTrackQueries(initial, services.content, services.clock, "ia_pratica");
    expect(query.reviewSkill?.skillId).toBe("entender");
    expect(query.reviewLesson?.id).toBe("l02");
    expect(query.dueReviews.map((entry) => entry.skillId)).toEqual(["desconhecida", "entender"]);
  });
});
