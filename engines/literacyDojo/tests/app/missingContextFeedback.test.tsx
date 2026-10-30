import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MissingContextView } from "../../src/components/MissingContextView";
import { lessons } from "../../src/data/generated/lessons";

it("marca a opção extra e o contexto obrigatório ausente somente após avaliação falha", () => {
  const activity = lessons.find((lesson) => lesson.id === "l01")?.activities[2];
  if (!activity || activity.type !== "missing_context") throw new Error("atividade ausente");
  const answer = { contextIds: ["tarefa-definida", "temperatura"] };
  const { rerender } = render(
    <MissingContextView
      activity={activity}
      answer={answer}
      invalidIds={[]}
      disabled={false}
      onChange={() => {}}
    />,
  );
  const extra = screen.getByTestId("context-temperatura");
  const missing = screen.getByTestId("context-contexto-minimo");
  const chosen = screen.getByTestId("context-tarefa-definida");
  expect(extra).not.toHaveAttribute("aria-invalid", "true");
  expect(missing).not.toHaveAttribute("aria-invalid", "true");
  rerender(
    <MissingContextView
      activity={activity}
      answer={answer}
      invalidIds={["contexto-minimo", "formato-esperado", "noExtraContext"]}
      disabled={false}
      onChange={() => {}}
    />,
  );
  expect(extra).toHaveAttribute("aria-invalid", "true");
  expect(missing).toHaveAttribute("aria-invalid", "true");
  expect(chosen).not.toHaveAttribute("aria-invalid", "true");
  expect(screen.getByTestId("context-nome-do-modelo-de-ia")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
