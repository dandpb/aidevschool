/**
 * W7 AID-5190 (contrato §7.2 — papel ReviewDue): deriva reason+dueIn em
 * pt-BR legível a partir do `nextReviewAt` agendado pelo corredor de
 * revisão. A literacy é bounded context local: revisão é do próprio
 * aparelho e o teto de estado continua `completed` — nada aqui toca
 * `mastered` (reservado ao verificador independente).
 */
export type ReviewDueInfo = {
  reason: "overdue" | "due";
  dueIn: string;
};

function localCalendarDay(date: Date): number {
  // Encode the local calendar date at UTC midnight; elapsed local midnights
  // can be 23 or 25 hours apart during daylight-saving transitions.
  const day = new Date(0);
  day.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return day.getTime();
}

export function reviewDueInfo(nextReviewAt: string, now: Date): ReviewDueInfo {
  const due = new Date(nextReviewAt);
  if (Number.isNaN(due.getTime())) return { reason: "due", dueIn: "devida hoje" };
  const days = Math.floor((localCalendarDay(now) - localCalendarDay(due)) / 86_400_000);
  if (days >= 1) {
    return { reason: "overdue", dueIn: `atrasada ${days} ${days === 1 ? "dia" : "dias"}` };
  }
  return { reason: "due", dueIn: "devida hoje" };
}
