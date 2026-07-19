/** Feedback formativo apresentado após uma tentativa avaliada. */

export type CheckFeedback = {
  checkId: string;
  passed: boolean;
  /** Mensagem "ainda falta X" específica do check (vem de feedback.perCheck do conteúdo). */
  message?: string;
};

export type AttemptFeedback = {
  pass: boolean;
  score: number;
  /** onSuccess quando passa; onFailure ("ainda falta X") quando não passa. */
  summary: string;
  perCheck: CheckFeedback[];
};
