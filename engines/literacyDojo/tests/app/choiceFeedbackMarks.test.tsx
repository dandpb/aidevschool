import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ChoiceView } from "../../src/components/ChoiceView";
import type { ChoiceActivity } from "../../src/data/generated/lessons";

it("mantém os checks de opções extras e ausentes em multiseleção", () => {
  const activity = {
    id: "multi",
    data: {
      multiSelect: true,
      options: [
        { id: "extra", text: "Extra" },
        { id: "missing", text: "Ausente" },
      ],
    },
  } as ChoiceActivity;
  render(
    <ChoiceView
      activity={activity}
      answer={{ optionIds: ["extra"] }}
      invalidIds={["extra", "missing"]}
      disabled={false}
      onChange={() => {}}
    />,
  );
  expect(screen.getByTestId("option-extra")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByTestId("option-missing")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByTestId("option-extra")).toHaveAccessibleName("Extra");
  expect(screen.getByTestId("option-extra")).toHaveAccessibleDescription("Desmarque esta opção.");
  expect(screen.getByTestId("option-missing")).toHaveAccessibleDescription(
    "Falta marcar esta opção.",
  );
});
