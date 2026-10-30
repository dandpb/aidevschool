import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { makeServices } from "../helpers";

describe("recuperação da conclusão de revisão", () => {
  it.each(["rejeição", "resultado incompleto"])(
    "mantém feedback após %s e permite tentativa deliberada",
    async (failure) => {
      const user = userEvent.setup();
      const { services, stateStore, initial } = makeServices();
      initial.onboarding = { completed: true, taskCategory: "scheduling" };
      initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "completed";
      stateStore.seedProgress(initial);
      const done = vi.fn();
      const complete = vi.spyOn(services.useCases, "completeReview");
      if (failure === "rejeição") {
        complete.mockRejectedValueOnce(new Error("private error"));
      } else {
        complete.mockResolvedValueOnce({
          progress: initial,
          ledger: stateStore.storedStateValue()!.xpLedger,
          outcome: { completed: false, lessonScore: 0, missingActivityIds: [] },
          firstCompletion: false,
        });
      }
      render(
        <ServicesProvider value={services}>
          <LessonScreen
            lessonId={MAP_INITIAL_LESSON_ID}
            mode="review"
            reviewStage={0}
            onboarding={initial.onboarding}
            onProgressChange={() => {}}
            onCompleted={done}
            onExit={() => {}}
          />
        </ServicesProvider>,
      );
      await user.click(screen.getByTestId("start-lesson"));
      await user.click(screen.getByTestId("output-out-b"));
      await user.click(screen.getByTestId("criterion-c-fontes"));
      await user.click(screen.getByTestId("criterion-c-limites"));
      await user.click(screen.getByTestId("submit-attempt"));
      await screen.findByTestId("next-activity");
      await user.click(screen.getByTestId("next-activity"));
      await user.click(screen.getByTestId("option-opt-verifica-na-fonte"));
      await user.click(screen.getByTestId("submit-attempt"));
      await screen.findByTestId("next-activity");
      await user.click(screen.getByTestId("next-activity"));
      await user.click(screen.getByTestId("submit-attempt"));
      const finish = await screen.findByTestId("finish-lesson");
      finish.focus();
      await user.keyboard("{Enter}");
      expect(await screen.findByRole("alert")).toHaveTextContent("pode já ter sido registrada");
      expect(screen.getByRole("alert")).not.toHaveTextContent("private error");
      expect(finish).toHaveFocus();
      expect(done).not.toHaveBeenCalled();
      await user.keyboard("{Enter}");
      expect(complete).toHaveBeenCalledTimes(2);
      expect(done).toHaveBeenCalledTimes(1);
    },
  );
});
