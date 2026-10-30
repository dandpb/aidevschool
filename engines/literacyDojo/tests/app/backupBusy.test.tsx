import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { ProgressScreen } from "../../src/screens/ProgressScreen";
import { makeServices } from "../helpers";

describe("restauração de backup", () => {
  it("impede nova restauração e saída interna enquanto a gravação está pendente", async () => {
    const { services, initial } = makeServices();
    let release!: () => void;
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    const onBack = vi.fn();
    const onProgressImported = vi.fn();
    const save = vi.spyOn(services.useCases, "importProgress").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(initial);
        }),
    );
    render(
      <ServicesProvider value={services}>
        <ProgressScreen
          progress={initial}
          onBack={onBack}
          onStartLesson={() => {}}
          onReview={() => {}}
          onProgressImported={onProgressImported}
        />
      </ServicesProvider>,
    );
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "{}" });
    screen.getByTestId("import-progress").focus();
    fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
    fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("progress-back")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId(`progress-start-${MAP_INITIAL_LESSON_ID}`)).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByTestId("import-progress")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Restaurando");
    await userEvent.click(screen.getByTestId("progress-back"));
    expect(onBack).not.toHaveBeenCalled();
    await act(async () => {
      release();
    });
    expect(onProgressImported).toHaveBeenCalledOnce();
    expect(screen.getByTestId("progress-back")).toHaveAttribute("aria-disabled", "false");
  });
  it("libera as ações e informa que o resultado pode ser incerto após falha", async () => {
    const { services, initial } = makeServices();
    vi.spyOn(services.useCases, "importProgress").mockRejectedValue(new Error("failure"));
    render(
      <ServicesProvider value={services}>
        <ProgressScreen
          progress={initial}
          onBack={() => {}}
          onStartLesson={() => {}}
          onReview={() => {}}
          onProgressImported={() => {}}
        />
      </ServicesProvider>,
    );
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "{}" });
    fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("gravação pode já ter ocorrido");
    expect(screen.getByTestId("progress-back")).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "false");
  });
  it("não inicia restauração enquanto uma exportação anterior está pendente", async () => {
    const { services, initial } = makeServices();
    let reject!: () => void;
    vi.spyOn(services.useCases, "exportProgress").mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = () => fail(new Error("export failure"));
        }),
    );
    const restore = vi.spyOn(services.useCases, "importProgress");
    render(
      <ServicesProvider value={services}>
        <ProgressScreen
          progress={initial}
          onBack={() => {}}
          onStartLesson={() => {}}
          onReview={() => {}}
          onProgressImported={() => {}}
        />
      </ServicesProvider>,
    );
    await userEvent.click(screen.getByTestId("export-progress"));
    expect(screen.getByRole("status")).toHaveTextContent("Preparando backup");
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "{}" });
    fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
    expect(restore).not.toHaveBeenCalled();
    await act(async () => {
      reject();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível preparar o backup. Nenhum download foi solicitado nesta tentativa. Tente novamente.",
    );
    expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "false");
  });
});
