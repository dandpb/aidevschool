import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

for (const interaction of ["focus", "wheel", "none"] as const) {
  it(`retry da lição respeita interação posterior: ${interaction}`, async () => {
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus.l02 = "available";
    initial.currentLessonId = "l02";
    stateStore.seedProgress(initial);
    const original = services.useCases.retryActivity.bind(services.useCases);
    let release!: () => void;
    vi.spyOn(services.useCases, "retryActivity").mockImplementationOnce(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(original(input));
        }),
    );
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(await screen.findByTestId("retry-activity"));
    const exit = screen.getByRole("button", { name: "Sair da lição" });
    if (interaction === "focus") exit.focus();
    if (interaction === "wheel") fireEvent.wheel(document);
    await act(async () => release());
    if (interaction === "focus") expect(exit).toHaveFocus();
    if (interaction === "wheel") expect(document.activeElement).toBe(document.body);
    if (interaction === "none") expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
}

it("remove os listeners se a tela desmontar durante um retry pendente", async () => {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus.l02 = "available";
  initial.currentLessonId = "l02";
  stateStore.seedProgress(initial);
  vi.spyOn(services.useCases, "retryActivity").mockImplementationOnce(() => new Promise(() => {}));
  const add = vi.spyOn(document, "addEventListener");
  const remove = vi.spyOn(document, "removeEventListener");
  const user = userEvent.setup();
  const { unmount } = render(<App services={services} />);
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await user.click(screen.getByTestId("output-out-a"));
  await user.click(screen.getByTestId("submit-attempt"));
  add.mockClear();
  await user.click(await screen.findByTestId("retry-activity"));
  const added = add.mock.calls.filter(([type]) =>
    ["pointerdown", "focusin", "wheel", "keydown"].includes(type),
  );
  expect(added).toHaveLength(4);
  unmount();
  for (const [type, listener] of added) {
    expect(remove).toHaveBeenCalledWith(type, listener);
  }
  add.mockRestore();
  remove.mockRestore();
});
