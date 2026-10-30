import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { makeServices } from "../helpers";

describe("aviso de retomada", () => {
  it.each(["review", "hosted"] as const)("aparece antes do início em %s", (variant) => {
    const { services, initial } = makeServices();
    render(
      <ServicesProvider value={services}>
        <LessonScreen
          lessonId={MAP_INITIAL_LESSON_ID}
          mode={variant === "review" ? "review" : "initial"}
          onboarding={initial.onboarding}
          missionEvents={
            variant === "hosted"
              ? { onBriefViewed: () => {}, onActivityPresented: () => {} }
              : undefined
          }
          onProgressChange={() => {}}
          onCompleted={() => {}}
          onExit={() => {}}
        />
      </ServicesProvider>,
    );
    const note = screen.getByTestId("session-continuity");
    const button = screen.getByTestId("start-lesson");
    expect(note).toHaveTextContent("as respostas da missão e a etapa atual não são recuperadas");
    expect(note.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
