import { expect, it, vi } from "vitest";
import { reviewDueInfo } from "../../src/domain/reviewDue";

it("conta datas locais mesmo quando o dia tem 23 ou 25 horas", () => {
  vi.stubEnv("TZ", "America/New_York");
  try {
    expect(
      reviewDueInfo("2026-03-08T15:00:00.000Z", new Date("2026-03-09T15:00:00.000Z")).dueIn,
    ).toBe("atrasada 1 dia");
    expect(
      reviewDueInfo("2026-03-07T15:00:00.000Z", new Date("2026-03-09T15:00:00.000Z")).dueIn,
    ).toBe("atrasada 2 dias");
    expect(
      reviewDueInfo("2026-11-01T15:00:00.000Z", new Date("2026-11-02T15:00:00.000Z")).dueIn,
    ).toBe("atrasada 1 dia");
    expect(
      reviewDueInfo("2026-03-09T13:00:00.000Z", new Date("2026-03-09T15:00:00.000Z")).dueIn,
    ).toBe("devida hoje");
  } finally {
    vi.unstubAllEnvs();
  }
});

it("mantém datas locais em mudanças de mês e ano e o fallback para datas inválidas", () => {
  vi.stubEnv("TZ", "Pacific/Auckland");
  try {
    expect(
      reviewDueInfo("2024-02-29T02:00:00.000Z", new Date("2024-03-01T02:00:00.000Z")).dueIn,
    ).toBe("atrasada 1 dia");
    expect(
      reviewDueInfo("2025-12-31T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")).dueIn,
    ).toBe("atrasada 1 dia");
    expect(reviewDueInfo("inválido", new Date("2026-01-01T00:00:00.000Z")).dueIn).toBe(
      "devida hoje",
    );
    expect(
      reviewDueInfo("2026-01-02T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")).dueIn,
    ).toBe("devida hoje");
  } finally {
    vi.unstubAllEnvs();
  }
});
