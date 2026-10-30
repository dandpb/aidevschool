import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import {
  BackupImportValidationError,
  BackupImportWriteError,
} from "../../src/application/backupImportErrors";
import { ProgressScreen } from "../../src/screens/ProgressScreen";
import { makeServices } from "../helpers";

function file(content: string, readError?: Error) {
  const item = new File([content], "backup.json", { type: "application/json" });
  Object.defineProperty(item, "text", {
    value: async () => {
      if (readError) throw readError;
      return content;
    },
  });
  return item;
}
function display(onProgressImported: () => void = () => {}) {
  const bundle = makeServices();
  render(
    <ServicesProvider value={bundle.services}>
      <ProgressScreen
        progress={bundle.initial}
        onBack={() => {}}
        onStartLesson={() => {}}
        onReview={() => {}}
        onProgressImported={onProgressImported}
      />
    </ServicesProvider>,
  );
  return bundle;
}
function upload(item: File) {
  fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [item] } });
}

describe("limite de validação de backup", () => {
  it("rejeita conteúdo inválido e versão incompatível antes da gravação", async () => {
    const { stateStore } = display();
    const save = vi.spyOn(stateStore, "saveState");
    upload(file("{"));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("inválido ou incompleto"),
    );
    expect(save).not.toHaveBeenCalled();
    upload(file('{"schemaVersion":5}'));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("não é compatível"),
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("rejeita ledger desconhecido sem gravar nem mostrar conteúdo do arquivo", async () => {
    const { services, stateStore } = display();
    const backup = JSON.parse(await services.useCases.exportProgress());
    backup.xpLedger.ledgerVersion = 999;
    backup.xpLedger.secret = "CONTEUDO_PRIVADO";
    const save = vi.spyOn(stateStore, "saveState");
    upload(file(JSON.stringify(backup)));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("formato incompatível"),
    );
    expect(screen.getByTestId("backup-status")).not.toHaveTextContent("CONTEUDO_PRIVADO");
    expect(save).not.toHaveBeenCalled();
  });
  it("mantém alerta incerto se o store falhar antes de gravar", async () => {
    const { services, stateStore } = display();
    const json = await services.useCases.exportProgress();
    const before = structuredClone(stateStore.storedStateValue());
    vi.spyOn(stateStore, "saveState").mockRejectedValue(new BackupImportValidationError("corrupt"));
    upload(file(json));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("pode já ter ocorrido"),
    );
    expect(stateStore.storedStateValue()).toEqual(before);
  });
  it("mostra incerteza quando o store grava e lança erro da mesma classe", async () => {
    const { services, stateStore } = display();
    const json = await services.useCases.exportProgress();
    const original = stateStore.saveState.bind(stateStore);
    vi.spyOn(stateStore, "saveState").mockImplementation(async (next) => {
      await original(next);
      throw new BackupImportValidationError("corrupt");
    });
    upload(file(json));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("pode já ter ocorrido"),
    );
    expect(stateStore.storedStateValue()?.origin).toBe("import");
  });
  it("falha de leitura com mesma classe não é tratada como validação", async () => {
    display();
    upload(file("", new BackupImportValidationError("corrupt")));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("pode já ter ocorrido"),
    );
  });
  it("falha no callback após gravação permanece incerta mesmo com classe de validação", async () => {
    const bundle = display(() => {
      throw new BackupImportValidationError("corrupt");
    });
    const json = await bundle.services.useCases.exportProgress();
    const save = vi.spyOn(bundle.stateStore, "saveState");
    upload(file(json));
    await waitFor(() =>
      expect(screen.getByTestId("backup-status")).toHaveTextContent("pode já ter ocorrido"),
    );
    expect(save).toHaveBeenCalledOnce();
  });
  it("o caso de uso classifica como incerta a exceção do store, mesmo após salvar", async () => {
    const { services, stateStore } = makeServices();
    const json = await services.useCases.exportProgress();
    const original = stateStore.saveState.bind(stateStore);
    vi.spyOn(stateStore, "saveState").mockImplementation(async (next) => {
      await original(next);
      throw new BackupImportValidationError("corrupt");
    });
    await expect(services.useCases.importProgress(json)).rejects.toBeInstanceOf(
      BackupImportWriteError,
    );
    expect(stateStore.storedStateValue()?.origin).toBe("import");
  });
});
