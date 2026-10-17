/**
 * Chaves de armazenamento local, em módulo próprio (sem classes) para que os
 * testes e2e possam importá-las sem carregar os adapters.
 */
export const DB_NAME = "literacydojo";
export const STORE_NAME = "progress";

/**
 * Ramo legado (AID-3888): o cliente novo NUNCA escreve nesta chave — é
 * somente leitura/histórico após o corte. Clientes antigos continuam
 * lendo/escrevendo aqui sem alterar o estado novo (isolamento `3b9e7f8a`).
 */
export const PROGRESS_KEY = "learner-progress";

/** Estado autoritativo completo (progresso + XP + ledger) — namespace próprio. */
export const LEARNER_STATE_KEY = "learner-state-v2";

/** Snapshot do corte, persistido ANTES da ativação do estado novo. */
export const CUTOVER_SNAPSHOT_KEY = "cutover-snapshot-v1";

/** Marker de reset explícito (marker-first: antes de apagar o estado). */
export const RESET_INTENT_KEY = "reset-intent-v1";

/** Espelho de evidência em sessionStorage — canal de teste do DevtoolsBridgeEvidenceSink. */
export const EVIDENCE_SESSION_KEY = "literacydojo:evidence";

/** Acks do aviso de retrofit (O3-C1): JSON estruturado lessonId → contentVersion. */
export const RETROFIT_ACKS_KEY = "literacydojo:retrofit-acks";
