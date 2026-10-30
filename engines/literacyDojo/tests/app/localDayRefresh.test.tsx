import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, it, vi } from "vitest";
import { useLocalDayRefresh } from "../../src/app/useLocalDayRefresh";
import { currentStreakForDate } from "../../src/domain/progress";

const clock = () => new Date();
function Probe() {
  useLocalDayRefresh(clock);
  const value = currentStreakForDate(
    { current: 5, longest: 9, lastActivityDate: "2026-03-07" },
    clock(),
  );
  return <span>{value}</span>;
}

it("atualiza na virada local, ao voltar à aba e limpa o timer", () => {
  vi.stubEnv("TZ", "America/New_York");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-09T03:59:00Z"));
  try {
    const view = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    expect(vi.getTimerCount()).toBe(1);
    expect(screen.getByText("5")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByText("0")).toBeInTheDocument();
    vi.setSystemTime(new Date("2026-03-08T15:00:00Z"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
});
