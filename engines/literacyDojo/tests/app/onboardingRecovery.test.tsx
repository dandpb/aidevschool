import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

async function reachFinal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("onboarding-next"));
  for (const value of ["save_time", "work", "medium", "scheduling"]) {
    await user.click(screen.getByTestId(`onboarding-option-${value}`));
    if (value !== "scheduling") await user.click(screen.getByTestId("onboarding-next"));
  }
}

describe("recuperação do onboarding", () => {
  it("bloqueia gravações repetidas e mudanças durante espera, recuperando após falha", async () => {
    const { services } = makeServices();
    let reject!: () => void;
    const save = vi.spyOn(services.useCases, "completeOnboarding").mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = () => fail(new Error("simulated"));
        }),
    );
    const user = userEvent.setup();
    render(<App services={services} />);
    await reachFinal(user);
    const next = screen.getByTestId("onboarding-next");
    next.focus();
    act(() => {
      next.click();
      next.click();
    });
    expect(save).toHaveBeenCalledOnce();
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveFocus();
    expect(screen.getByTestId("onboarding-option-scheduling")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByTestId("onboarding-option-scheduling")).toBeInTheDocument();
    await act(async () => {
      reject();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("podem já ter sido salvas");
    expect(next).toHaveAttribute("aria-disabled", "false");
    expect(next).toHaveFocus();
    expect(screen.getByTestId("onboarding-option-scheduling")).toBeChecked();
    await user.click(next);
    expect(await screen.findByTestId("map-screen")).toBeVisible();
  });
});
