/**
 * Chaves de armazenamento local, em módulo próprio (sem classes) para que os
 * testes e2e possam importá-las sem carregar os adapters.
 */
export const DB_NAME = "literacydojo";
export const STORE_NAME = "progress";
export const PROGRESS_KEY = "learner-progress";

/** Espelho de evidência em sessionStorage — canal de teste do DevtoolsBridgeEvidenceSink. */
export const EVIDENCE_SESSION_KEY = "literacydojo:evidence";
