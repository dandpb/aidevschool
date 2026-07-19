import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OutputComparisonView } from "../../src/components/OutputComparisonView";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import { lessons } from "../../src/data/generated/lessons";
import type { OutputComparisonAnswer } from "../../src/domain/evaluation";

const activity = lessons
  .find((lesson) => lesson.id === "l02")
  ?.activities.find((item) => item.type === "output_comparison") as OutputComparisonActivity;

describe("OutputComparisonView", () => {
  it("seleciona saída e critérios via controles acessíveis", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const answer: OutputComparisonAnswer = { outputId: undefined, criterionIds: [] };
    render(
      <OutputComparisonView
        activity={activity}
        answer={answer}
        invalidIds={[]}
        disabled={false}
        onChange={onChange}
      />,
    );

    const [firstOutput] = activity.data.outputs;
    await user.click(screen.getByTestId(`output-${firstOutput.id}`));
    expect(onChange).toHaveBeenCalledWith({ ...answer, outputId: firstOutput.id });

    const [firstCriterion] = activity.data.criteria;
    await user.click(screen.getByTestId(`criterion-${firstCriterion.id}`));
    expect(onChange).toHaveBeenCalledWith({ ...answer, criterionIds: [firstCriterion.id] });
  });

  it("cenário do conteúdo é exibido", () => {
    render(
      <OutputComparisonView
        activity={activity}
        answer={{ criterionIds: [] }}
        invalidIds={[]}
        disabled={false}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText(activity.data.scenario)).toBeInTheDocument();
  });
});
