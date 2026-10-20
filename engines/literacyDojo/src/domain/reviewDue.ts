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

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function reviewDueInfo(nextReviewAt: string, now: Date): ReviewDueInfo {
  const due = new Date(nextReviewAt);
  if (Number.isNaN(due.getTime())) return { reason: "due", dueIn: "devida hoje" };
  const days = Math.floor((startOfDay(now) - startOfDay(due)) / 86_400_000);
  if (days >= 1) {
    return { reason: "overdue", dueIn: `atrasada ${days} ${days === 1 ? "dia" : "dias"}` };
  }
  return { reason: "due", dueIn: "devida hoje" };
}
