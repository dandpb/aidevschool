import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

it("conta somente lições Dev com conteúdo e usa o singular quando necessário", async () => {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus.l02 = "available";
  initial.currentLessonId = "l02";
  stateStore.seedProgress(initial);
  const listModules = services.content.listModules.bind(services.content);
  vi.spyOn(services.content, "listModules").mockImplementation((journey) => {
    const modules = listModules(journey);
    if (journey !== "dev") return modules;
    let readyKept = false;
    return modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const hasContent = lesson.hasContent && !readyKept;
        if (hasContent) readyKept = true;
        return { ...lesson, hasContent };
      }),
    }));
  });
  render(<App services={services} />);
  expect(await screen.findByTestId("journey-switch-dev")).toHaveTextContent(
    "1 lição para quem programa",
  );
});
