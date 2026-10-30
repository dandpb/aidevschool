import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { createServices } from "../../src/app/services";
import { InMemoryProgressRepository } from "../fakes";
import { makeServices } from "../helpers";

function setup() {
  const bundle = makeServices();
  bundle.initial.onboarding = { completed: true, taskCategory: "scheduling" };
  bundle.initial.lessonStatus.l02 = "available";
  bundle.initial.currentLessonId = "l02";
  bundle.stateStore.seedProgress(bundle.initial);
  return bundle;
}

async function upload() {
  const file = new File(["{}"], "backup.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => "{}" });
  fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
}

it("mantém a restauração ocupada até reler o estado e respeita o foco", async () => {
  const { services, stateStore, initial } = setup();
  vi.spyOn(services.useCases, "importProgress").mockImplementationOnce(async () => {
    stateStore.seedProgress({ ...initial, xp: 55 });
    throw new Error("falha após salvar");
  });
  const realRead = services.useCases.readBackupProgressForRecovery.bind(services.useCases);
  let release!: () => void;
  vi.spyOn(services.useCases, "readBackupProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve(realRead());
      }),
  );
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("open-progress"));
  const button = screen.getByTestId("import-progress");
  button.focus();
  await upload();
  await waitFor(() => expect(release).toBeTypeOf("function"));
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByTestId("progress-back")).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByTestId("progress-back"));
  expect(screen.getByTestId("progress-screen")).toBeVisible();
  await act(async () => release());
  expect(button).toHaveFocus();
  expect(screen.getByTestId("progress-xp")).toHaveTextContent("55 XP");
  expect(screen.getByTestId("backup-status")).toHaveTextContent("pode já ter ocorrido");
  expect(screen.getByTestId("backup-status")).not.toHaveTextContent("Backup restaurado");
});

it("bloqueia novas mutações se não consegue reler após falha", async () => {
  const { services } = setup();
  vi.spyOn(services.useCases, "importProgress").mockRejectedValueOnce(new Error("gravação"));
  vi.spyOn(services.useCases, "readBackupProgressForRecovery").mockRejectedValueOnce(
    new Error("leitura"),
  );
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("open-progress"));
  await upload();
  expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByTestId("progress-back"));
  expect(screen.getByTestId("continue-button")).toHaveAttribute("aria-disabled", "true");
});

it("falha ao ler arquivo não bloqueia ações nem tenta reler estado", async () => {
  const { services } = setup();
  const recover = vi.spyOn(services.useCases, "readBackupProgressForRecovery");
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("open-progress"));
  const file = new File([""], "backup.json");
  Object.defineProperty(file, "text", {
    value: async () => {
      throw new Error("arquivo");
    },
  });
  fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
  expect(await screen.findByTestId("backup-status")).toHaveTextContent(
    "Nenhuma restauração foi iniciada nesta tentativa",
  );
  expect(recover).not.toHaveBeenCalled();
  expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "false");
});

it("não reconcilia backup com repositório legado separado", async () => {
  const { services, stateStore, initial } = setup();
  const legacy = new InMemoryProgressRepository();
  await legacy.save({ ...initial, xp: 99 });
  const mixed = createServices({ content: services.content, stateStore, progressRepo: legacy });
  await expect(mixed.useCases.readBackupProgressForRecovery()).rejects.toThrow(/legado/);
  expect((await stateStore.loadProgress())?.xp).toBe(0);
  expect((await legacy.load())?.xp).toBe(99);
});
