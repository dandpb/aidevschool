import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChoiceView } from "../../src/components/ChoiceView";
import { FeedbackPanel } from "../../src/components/FeedbackPanel";
import type { ChoiceActivity } from "../../src/data/generated/lessons";
import type { AttemptFeedback } from "../../src/domain/feedback";

/**
 * AID-1096/W3 — contrato do loop tentativa/feedback/retry (docs/design/
 * design-foundations.md §3, spec canônica AID-914 §4 rev 70649549):
 * - ActivityInput: checks falhando marcados com aria-invalid (§4.1);
 * - FeedbackPanel: live region com CheckList específico por check falho (§4.1)
 *   e testid canônico feedback-panel (§4.3-4);
 * - forced-colors wave 1 (B7): regras @media (forced-colors: active) presentes
 *   no stylesheet da engine (distinção sem cor: fail/inválido dashed, pass solid).
 */

const choiceActivity: ChoiceActivity = {
  id: "c-w3",
  kind: "choice",
  instruction: "Escolha a opção mais confiável.",
  data: {
    prompt: "Cenário de teste.",
    multiSelect: false,
    options: [
      { id: "opt-a", text: "Opção A" },
      { id: "opt-b", text: "Opção B" },
    ],
  },
} as unknown as ChoiceActivity;

describe("AID-1096/W3: contrato do loop — ActivityInput", () => {
  it("marca com aria-invalid apenas as opções cobertas por checks falhos", () => {
    render(
      <ChoiceView
        activity={choiceActivity}
        answer={{ optionIds: ["opt-a"] }}
        invalidIds={["opt-a"]}
        disabled={false}
        onChange={() => undefined}
      />,
    );
    const failed = screen.getByTestId("option-opt-a");
    const clean = screen.getByTestId("option-opt-b");
    expect(failed).toHaveAttribute("aria-invalid", "true");
    // sem check falho, o atributo não existe (não basta aria-invalid="false")
    expect(clean).not.toHaveAttribute("aria-invalid");
  });
});

describe("AID-1096/W3: contrato do loop — FeedbackPanel", () => {
  const failingFeedback: AttemptFeedback = {
    pass: false,
    score: 0.5,
    summary: "Quase lá.",
    perCheck: [
      { checkId: "chk-1", passed: false, message: "Ainda falta citar a fonte dos dados." },
      { checkId: "chk-2", passed: true, message: "OK" },
    ],
  };

  it("live region com testid canônico e CheckList específico por check falho", () => {
    render(<FeedbackPanel feedback={failingFeedback} hintsShown={["Dica 1"]} />);
    const panel = screen.getByTestId("feedback-panel");
    expect(panel).toHaveAttribute("aria-live", "polite");
    expect(panel).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByTestId("feedback-check-chk-1")).toHaveTextContent(
      "Ainda falta citar a fonte dos dados.",
    );
    // check que passou não vira item de CheckList
    expect(screen.queryByTestId("feedback-check-chk-2")).not.toBeInTheDocument();
  });
});

describe("AID-1096/W3: forced-colors wave 1 (B7) no stylesheet", () => {
  it("distinção sem cor sob @media (forced-colors: active): fail/inválido dashed, pass solid, botões com borda", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const css = await readFile(join(process.cwd(), "src/styles.css"), "utf8");
    const fcBlock = css.slice(css.indexOf("@media (forced-colors: active)"));
    expect(fcBlock).toContain(".feedback-fail");
    expect(fcBlock).toContain("border-style: dashed");
    expect(fcBlock).toContain(".feedback-pass");
    expect(fcBlock).toContain("border-style: solid");
    expect(fcBlock).toContain(".option-card.is-invalid");
    expect(fcBlock).toContain(".btn");
    expect(fcBlock).toContain("border: 2px solid ButtonText");
  });
});
