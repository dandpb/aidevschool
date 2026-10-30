import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === "l02");
if (!lesson) throw new Error("lição ausente");

describe("pontuação no resultado", () => {
  for (const [mode, hosted] of [
    ["initial", false],
    ["review", false],
    ["initial", true],
    ["review", true],
  ] as const) {
    it(`apresenta a pontuação sem alegar XP novo: ${mode}, host=${hosted}`, () => {
      const { services } = makeServices();
      render(
        <ServicesProvider value={services}>
          <ResultScreen
            summary={{ lesson: lesson!, lessonScore: 0.75, activityResults: [], mode }}
            onNextLesson={() => {}}
            onHome={() => {}}
            onMap={() => {}}
            hosted={hosted}
          />
        </ServicesProvider>,
      );
      const result = screen.getByTestId("result-screen");
      expect(result).toHaveTextContent("75% de pontuação");
      expect(result).not.toHaveTextContent("XP conquistado");
      if (mode === "review") expect(result).toHaveTextContent("Revisão registrada");
    });
  }
});
