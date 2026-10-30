import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import { bootRecoveryMessage } from "../../src/app/bootRecoveryMessage";
import { BootBlockedError, type BootBlockedReason } from "../../src/app/services";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { makeServices } from "../helpers";

const reasons: [BootBlockedReason, string][] = [
  ["state-read-error", "Não foi possível acessar o armazenamento"],
  ["snapshot-read-error", "Não foi possível acessar o armazenamento"],
  ["intent-read-error", "Não foi possível acessar o armazenamento"],
  ["legacy-read-error", "Não foi possível acessar o armazenamento"],
  ["state-invalid", "não reconhece os dados locais"],
  ["snapshot-invalid", "não reconhece os dados locais"],
  ["intent-invalid", "não reconhece os dados locais"],
  ["legacy-invalid", "não reconhece os dados locais"],
  ["intent-mismatch", "registros locais necessários para iniciar são inconsistentes"],
  ["legacy-diverged", "registros locais necessários para iniciar são inconsistentes"],
];

it.each(reasons)("apresenta %s sem expor detalhe nem mudar o motivo", (reason, expected) => {
  const error = new BootBlockedError(reason, "DETALHE_TECNICO");
  expect(bootRecoveryMessage(error)).toContain(expected);
  expect(bootRecoveryMessage(error)).not.toContain("DETALHE_TECNICO");
  expect(error.reason).toBe(reason);
});

it.each(["readState", "readSnapshot", "readResetIntent", "readLegacyRaw"] as const)(
  "bloqueia %s sem gravar ou diagnosticar formato",
  async (failingRead) => {
    const { services, stateStore } = makeServices();
    vi.spyOn(stateStore, "readState").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readSnapshot").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readResetIntent").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readLegacyRaw").mockResolvedValue({ status: "absent" });
    vi.mocked(stateStore[failingRead]).mockResolvedValue({
      status: "read-error",
      error: new Error("PRIVATE_DETAIL"),
    });
    const writes = [
      "saveState",
      "activateState",
      "deleteState",
      "persistSnapshot",
      "saveResetIntent",
      "deleteResetIntent",
    ] as const;
    const spies = writes.map((method) => vi.spyOn(stateStore, method));
    render(<App services={services} />);
    const recovery = await screen.findByTestId("error-recovery-screen");
    expect(recovery).toHaveTextContent("Não foi possível acessar o armazenamento");
    expect(recovery).not.toHaveTextContent("PRIVATE_DETAIL");
    expect(recovery).not.toHaveTextContent("formato não reconhecido");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  },
);

it("não garante ausência de escrita quando ativação grava e depois falha", async () => {
  const { services, stateStore } = makeServices();
  vi.spyOn(stateStore, "readState").mockResolvedValue({ status: "absent" });
  const activate = stateStore.activateState.bind(stateStore);
  vi.spyOn(stateStore, "activateState").mockImplementationOnce(async (state) => {
    await activate(state);
    throw new Error("PRIVATE_DETAIL");
  });
  render(<App services={services} />);
  const recovery = await screen.findByTestId("error-recovery-screen");
  expect(recovery).toHaveTextContent("pode ter sido alterado antes da falha");
  expect(recovery).not.toHaveTextContent("PRIVATE_DETAIL");
  expect(stateStore.storedStateValue()?.origin).toBe("fresh-seed");
});

it("erro genérico antes da ativação não expõe detalhes nem ativa estado", async () => {
  const { services, stateStore } = makeServices();
  vi.spyOn(stateStore, "readState").mockResolvedValue({ status: "absent" });
  vi.spyOn(stateStore, "persistSnapshot").mockRejectedValueOnce(new Error("PRIVATE_DETAIL"));
  const activate = vi.spyOn(stateStore, "activateState");
  render(<App services={services} />);
  const recovery = await screen.findByTestId("error-recovery-screen");
  expect(recovery).toHaveTextContent(
    /não foi possível iniciar nem confirmar o estado do progresso/i,
  );
  expect(recovery).not.toHaveTextContent("PRIVATE_DETAIL");
  expect(activate).not.toHaveBeenCalled();
});

it("no host mantém navegação do aplicativo hospedeiro e não inicia missão", async () => {
  const { services, stateStore } = makeServices();
  vi.spyOn(stateStore, "readState").mockResolvedValue({
    status: "read-error",
    error: new Error("PRIVATE_DETAIL"),
  });
  const host = new LiteracyMissionAdapter();
  const start = vi.spyOn(host, "start");
  render(<AppShell services={services} hostAdapter={host} />);
  const recovery = await screen.findByTestId("error-recovery-screen");
  expect(recovery).toHaveTextContent("Não foi possível acessar o armazenamento");
  expect(recovery).toHaveTextContent("navegação do aplicativo que abriu esta missão");
  expect(screen.queryByRole("button", { name: "Recarregar página" })).not.toBeInTheDocument();
  expect(start).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Não foi possível continuar" })).toHaveFocus();
});
