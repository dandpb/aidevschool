import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import { bootRecoveryMessage } from "../../src/app/bootRecoveryMessage";
import { BootBlockedError, type BootBlockedReason } from "../../src/app/services";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { makeServices } from "../helpers";

const readReasons: BootBlockedReason[] = [
  "state-read-error",
  "snapshot-read-error",
  "intent-read-error",
  "legacy-read-error",
];

it.each(readReasons)("explica acesso negado em %s sem mudar o motivo", (reason) => {
  const error = new BootBlockedError(
    reason,
    "PRIVATE_DETAIL",
    new DOMException("PRIVATE_DETAIL", "SecurityError"),
  );
  expect(bootRecoveryMessage(error)).toContain("Não foi possível acessar o armazenamento");
  expect(bootRecoveryMessage(error)).not.toContain("PRIVATE_DETAIL");
  expect(error.reason).toBe(reason);
});

it("preserva a mensagem existente para outras falhas de boot", () => {
  const error = new BootBlockedError(
    "state-read-error",
    "armazenamento local inacessível (teste)",
    new Error("armazenamento local inacessível (teste)"),
  );
  expect(bootRecoveryMessage(error)).toBe(error.message);
  const generic = new Error("erro anterior");
  expect(bootRecoveryMessage(generic)).toBe(generic.message);
  const nameOnly = new BootBlockedError("state-read-error", "detalhe", { name: "SecurityError" });
  expect(bootRecoveryMessage(nameOnly)).toBe(nameOnly.message);
  const invalid = new BootBlockedError(
    "state-invalid",
    "detalhe",
    new DOMException("x", "SecurityError"),
  );
  expect(bootRecoveryMessage(invalid)).toBe(invalid.message);
  expect(bootRecoveryMessage(null)).toBe("Não foi possível ler o progresso local deste navegador.");
});

it.each(["readState", "readSnapshot", "readResetIntent", "readLegacyRaw"] as const)(
  "bloqueia %s com acesso negado sem gravar ou diagnosticar formato",
  async (failingRead) => {
    const { services, stateStore } = makeServices();
    vi.spyOn(stateStore, "readState").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readSnapshot").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readResetIntent").mockResolvedValue({ status: "absent" });
    vi.spyOn(stateStore, "readLegacyRaw").mockResolvedValue({ status: "absent" });
    vi.mocked(stateStore[failingRead]).mockResolvedValue({
      status: "read-error",
      error: new DOMException("PRIVATE_DETAIL", "SecurityError"),
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

it("no host mantém navegação do aplicativo hospedeiro e não inicia missão", async () => {
  const { services, stateStore } = makeServices();
  vi.spyOn(stateStore, "readState").mockResolvedValue({
    status: "read-error",
    error: new DOMException("PRIVATE_DETAIL", "SecurityError"),
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
