import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, it, vi } from "vitest";
import { useTimeBasedRefresh } from "../../src/app/useTimeBasedRefresh";
import { currentStreakForDate } from "../../src/domain/progress";
import type { LearnerProgress } from "../../src/domain/progress";

const clock = () => new Date();
function Probe() {
  useTimeBasedRefresh(clock);
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

it("reagenda prazos futuros, ignora inválidos e cancela timer ao trocar a agenda", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
  const skill = (nextReviewAt: string) => ({ nextReviewAt }) as LearnerProgress["skills"][string];
  const initial = {
    a: skill("2026-10-30T12:01:00.000Z"),
    b: skill("2026-10-30T12:03:00.000Z"),
    c: skill("inválida"),
  };
  function ReviewProbe({ skills }: { skills: LearnerProgress["skills"] }) {
    useTimeBasedRefresh(clock, skills);
    const due = Object.values(skills).filter(
      (item) => item.nextReviewAt && item.nextReviewAt <= clock().toISOString(),
    ).length;
    return <span>{due}</span>;
  }
  try {
    const view = render(
      <StrictMode>
        <ReviewProbe skills={initial} />
      </StrictMode>,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByText("1")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(120_000));
    expect(screen.getByText("2")).toBeInTheDocument();
    const replacement = { d: skill("2026-10-30T12:04:00.000Z") };
    view.rerender(
      <StrictMode>
        <ReviewProbe skills={replacement} />
      </StrictMode>,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByText("1")).toBeInTheDocument();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
