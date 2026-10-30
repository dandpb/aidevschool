import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { makeServices } from "../helpers";

describe("leitura de retomada durante boot", () => {
  it.each(["read-error", "present-invalid", "absent"] as const)(
    "mostra recuperação se segunda leitura retorna %s após estado válido",
    async (status) => {
      const { services, stateStore, initial } = makeServices();
      initial.onboarding = { completed: true, taskCategory: "scheduling" };
      stateStore.seedProgress(initial);
      const value = stateStore.storedStateValue();
      if (!value) throw new Error("estado ausente");
      const second =
        status === "read-error"
          ? ({ status, error: new Error("read failed") } as const)
          : status === "present-invalid"
            ? ({ status, value: {} } as const)
            : ({ status } as const);
      vi.spyOn(stateStore, "readState")
        .mockResolvedValueOnce({ status: "present-valid", value })
        .mockResolvedValueOnce(second);
      const save = vi.spyOn(stateStore, "saveState");
      render(<App services={services} />);
      expect(await screen.findByTestId("error-recovery-screen")).toHaveTextContent(
        "Não foi possível confirmar o progresso salvo",
      );
      expect(screen.getByRole("button", { name: "Recarregar página" })).toBeVisible();
      expect(screen.queryByTestId("assistant-welcome")).toBeNull();
      expect(save).not.toHaveBeenCalled();
    },
  );
  it("mostra recuperação se a promessa de retomada rejeitar", async () => {
    const { services } = makeServices();
    vi.spyOn(services.useCases, "resumeSession").mockRejectedValue(new Error("detalhe privado"));
    render(<App services={services} />);
    const recovery = await screen.findByTestId("error-recovery-screen");
    expect(recovery).toHaveTextContent("Não foi possível confirmar o progresso salvo");
    expect(recovery).not.toHaveTextContent("detalhe privado");
  });
  it("ignora rejeição depois de desmontar a tela", async () => {
    const { services } = makeServices();
    let reject!: (reason: Error) => void;
    const resume = vi.spyOn(services.useCases, "resumeSession").mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const view = render(<App services={services} />);
    await waitFor(() => expect(resume).toHaveBeenCalled());
    view.unmount();
    await act(async () => {
      reject(new Error("after unmount"));
      await Promise.resolve();
    });
    expect(screen.queryByTestId("error-recovery-screen")).toBeNull();
  });
  it("o host não executa a retomada standalone", async () => {
    const { services } = makeServices();
    const resume = vi.spyOn(services.useCases, "resumeSession");
    const adapter = new LiteracyMissionAdapter();
    const start = vi.spyOn(adapter, "start").mockReturnValue(() => {});
    render(<AppShell services={services} hostAdapter={adapter} />);
    await waitFor(() => expect(start).toHaveBeenCalled());
    expect(resume).not.toHaveBeenCalled();
  });
});
