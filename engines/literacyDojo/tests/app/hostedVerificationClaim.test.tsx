import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UnavailableVerificationClient } from "../../src/adapters/httpVerificationClient";
import { ServicesProvider } from "../../src/app/services";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

it("não promete verificação hospedada quando não há confirmação", async () => {
  const { services } = makeServices();
  services.verification = new UnavailableVerificationClient();
  const lesson = services.content.getLesson("l02");
  const activity = lesson?.activities[0];
  if (!lesson || !activity || activity.type !== "output_comparison")
    throw new Error("fixture ausente");
  const result = await services.useCases.submitActivityAttempt({
    lessonId: lesson.id,
    activityId: activity.id,
    answer: {
      outputId: activity.evaluation.betterOutputId,
      criterionIds: activity.evaluation.requiredCriterionIds,
    },
  });
  render(
    <ServicesProvider value={services}>
      <ResultScreen
        summary={{
          lesson,
          lessonScore: 1,
          activityResults: [],
          mode: "initial",
          evidenceRecord: result.record,
        }}
        onNextLesson={() => {}}
        onHome={() => {}}
        onMap={() => {}}
        hosted
      />
    </ServicesProvider>,
  );
  expect(
    await screen.findByText(/verificação independente ainda não está configurada/i),
  ).toBeVisible();
  expect(screen.getByTestId("completion-distinction")).not.toHaveTextContent(
    "A evidência seguirá para verificação independente",
  );
  expect(screen.getByTestId("completion-distinction")).toHaveTextContent(
    "A comprovação exige verificação independente",
  );
});
