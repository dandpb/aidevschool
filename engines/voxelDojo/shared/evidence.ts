import { configureEvidenceParentOrigin } from "../../shared/teaching-evidence/emit"

configureEvidenceParentOrigin(
  import.meta.env["VITE_CODEXDOJO_OS_ORIGIN"]
    || (import.meta.env.DEV ? "http://127.0.0.1:4174" : undefined),
)

/** Re-export only — implementation lives in engines/shared/teaching-evidence. */
export * from "../../shared/teaching-evidence/emit"
