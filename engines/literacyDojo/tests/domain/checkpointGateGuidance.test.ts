import { expect, it } from "vitest";
import { buildTrackQueries } from "../../src/domain/trackQueries";
import { makeServices } from "../helpers";

it("associa cada aviso apenas ao gate que ainda bloqueia a primeira lição", () => {
  const { services, initial } = makeServices();
  initial.lessonStatus.l03 = "completed";
  initial.lessonStatus.l07 = "completed";
  initial.lessonStatus.l11 = "completed";
  initial.lessonStatus.l04 = "available";
  initial.lessonStatus.l08 = "locked";
  initial.lessonStatus.l12 = "locked";
  const modules = services.content.listModules("ia_pratica");
  const query = () => buildTrackQueries(initial, services.content, services.clock, "ia_pratica");
  const gates = () =>
    Object.fromEntries(
      query().checkpointSummaries.map((entry) => [entry.checkpoint.id, entry.gatesModuleTitle]),
    );
  expect(gates()["cp-01"]).toBeUndefined();
  expect(gates()["cp-02"]).toBe(modules.find((module) => module.id === "mod-03")?.title);
  expect(gates()["cp-03"]).toBe(modules.find((module) => module.id === "mod-04")?.title);
  for (const status of ["in_progress", "completed"] as const) {
    initial.lessonStatus.l08 = status;
    expect(gates()["cp-02"]).toBeUndefined();
  }
});
