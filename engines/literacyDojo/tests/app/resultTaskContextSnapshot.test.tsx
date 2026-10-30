import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === "l02");
if (!lesson) throw new Error("lição ausente");

describe.each([false, true])("resultado com host=%s", (hosted) => {
  it("usa a categoria recebida sem reler o armazenamento", () => {
    const { services } = makeServices();
    const read = vi.spyOn(services.stateStore, "readState").mockRejectedValue(new Error("falha"));
    render(
      <ServicesProvider value={services}>
        <ResultScreen
          summary={{ lesson: lesson!, lessonScore: 1, activityResults: [], nextLessonId: "l01" }}
          taskCategory="communication"
          onNextLesson={() => {}}
          onHome={() => {}}
          onMap={() => {}}
          hosted={hosted}
        />
      </ServicesProvider>,
    );
    expect(screen.getByTestId("result-task-context")).toHaveTextContent("preparar uma mensagem");
    expect(read).not.toHaveBeenCalled();
  });
  it("não inventa uma categoria quando ela não foi fornecida", () => {
    const { services } = makeServices();
    render(
      <ServicesProvider value={services}>
        <ResultScreen
          summary={{ lesson: lesson!, lessonScore: 1, activityResults: [], nextLessonId: "l01" }}
          onNextLesson={() => {}}
          onHome={() => {}}
          onMap={() => {}}
          hosted={hosted}
        />
      </ServicesProvider>,
    );
    expect(screen.queryByTestId("result-task-context")).not.toBeInTheDocument();
  });
});
