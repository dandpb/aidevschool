import { BootBlockedError } from "./services";

/** User-facing guidance; error details stay out of the learner interface. */
export function bootRecoveryMessage(error: unknown): string {
  if (error instanceof BootBlockedError) {
    switch (error.reason) {
      case "state-read-error":
      case "snapshot-read-error":
      case "intent-read-error":
      case "legacy-read-error":
        return "Não foi possível acessar o armazenamento deste navegador. Tente novamente; se o problema persistir, procure ajuda.";
      case "state-invalid":
      case "snapshot-invalid":
      case "intent-invalid":
      case "legacy-invalid":
        return "O aplicativo não reconhece os dados locais necessários para iniciar. Não foi possível continuar com segurança; procure ajuda.";
      case "intent-mismatch":
      case "legacy-diverged":
        return "Os registros locais necessários para iniciar são inconsistentes. Não foi possível continuar com segurança; procure ajuda.";
    }
  }
  return "Não foi possível iniciar nem confirmar o estado do progresso. Ele pode ter sido alterado antes da falha; procure ajuda se o problema persistir.";
}
