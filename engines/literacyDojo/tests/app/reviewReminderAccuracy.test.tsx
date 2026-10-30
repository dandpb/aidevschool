import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";
const lesson = lessons.find((item) => item.id === "l02");
if (!lesson) throw new Error("lição ausente");

describe("orientação sobre revisão", () => {
  for (const hosted of [false, true]) {
    it(`é fiel ao contexto host=${hosted}`, () => {
      const { services } = makeServices();
      render(
        <ServicesProvider value={services}>
          <ResultScreen
            summary={{ lesson: lesson!, lessonScore: 1, activityResults: [], mode: "review" }}
            onNextLesson={() => {}}
            onHome={() => {}}
            onMap={() => {}}
            hosted={hosted}
          />
        </ServicesProvider>,
      );
      const heading = screen.getByRole("heading", { name: "Para fixar" });
      const card = heading.closest<HTMLElement>(".card");
      if (!card) throw new Error("card ausente");
      expect(card).not.toHaveTextContent("Vamos lembrar você");
      expect(
        within(card).getByText(
          hosted ? /Acompanhe os próximos passos/ : /Quando houver revisões disponíveis/,
        ),
      ).toBeVisible();
    });
  }
});
