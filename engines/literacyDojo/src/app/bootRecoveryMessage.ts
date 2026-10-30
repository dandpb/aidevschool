import { BootBlockedError } from "./services";

/** Show a specific message when the browser denies access to local storage. */
export function bootRecoveryMessage(error: unknown): string {
  if (
    error instanceof BootBlockedError &&
    error.reason.endsWith("-read-error") &&
    error.cause instanceof DOMException &&
    error.cause.name === "SecurityError"
  ) {
    return "Não foi possível acessar o armazenamento deste navegador. Tente novamente; se o problema persistir, procure ajuda.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível ler o progresso local deste navegador.";
}
