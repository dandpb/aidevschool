import { UnmigratableProgressError, type UnmigratableReason } from "../domain/migration";

/** Known parser rejection, constructed only before a save begins. */
export class BackupImportValidationError extends UnmigratableProgressError {
  constructor(reason: UnmigratableReason) {
    super(reason, "backup rejeitado antes da gravação");
    this.name = "BackupImportValidationError";
  }
}

/** A store error can be reported before or after a write commits. */
export class BackupImportWriteError extends Error {
  constructor() {
    super("Não foi possível confirmar a gravação do backup.");
    this.name = "BackupImportWriteError";
  }
}
