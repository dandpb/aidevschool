import { configureEvidenceParentOrigin } from "@aidevschool/evidence"

configureEvidenceParentOrigin(
  import.meta.env["VITE_CODEXDOJO_OS_ORIGIN"]
    || (import.meta.env.DEV ? "http://127.0.0.1:4174" : undefined),
)

export * from "@aidevschool/evidence"
