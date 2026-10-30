import { useEffect, useState } from "react";
import type { Clock } from "../adapters/clock";
import type { LearnerProgress } from "../domain/progress";
import { parseReviewTimestamp } from "../domain/reviewTimestamp";

/** Atualiza projeções na virada do dia, nos prazos de revisão e ao voltar à aba. */
export function useTimeBasedRefresh(clock: Clock, skills?: LearnerProgress["skills"]): void {
  const [, setRevision] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer);
      const now = clock();
      if (Number.isNaN(now.getTime())) return;
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const nextReview = Object.values(skills ?? {}).reduce((earliest, skill) => {
        const candidate = parseReviewTimestamp(skill?.nextReviewAt);
        return candidate !== null && candidate > now.getTime()
          ? Math.min(earliest, candidate)
          : earliest;
      }, Number.POSITIVE_INFINITY);
      const next = Math.min(midnight.getTime(), nextReview);
      timer = setTimeout(
        () => {
          setRevision((value) => value + 1);
          schedule();
        },
        Math.max(1000, next - now.getTime() + 50),
      );
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      setRevision((value) => value + 1);
      schedule();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clock, skills]);
}
