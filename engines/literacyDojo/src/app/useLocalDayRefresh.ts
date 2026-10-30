import { useEffect, useState } from "react";
import type { Clock } from "../adapters/clock";

/** Atualiza projeções de data local na virada do dia e ao voltar à aba. */
export function useLocalDayRefresh(clock: Clock): void {
  const [, setRevision] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer);
      const now = clock();
      if (Number.isNaN(now.getTime())) return;
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(
        () => {
          setRevision((value) => value + 1);
          schedule();
        },
        Math.max(1000, midnight.getTime() - now.getTime() + 50),
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
  }, [clock]);
}
