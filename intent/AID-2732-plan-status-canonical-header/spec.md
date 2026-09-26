# Spec — AID-2732 · header canônico no PLAN_APPROVED

Comportamento desejado:

- `freeze`/`load_from_registry` aceitam `plan.md` cujo header canônico
  carregue `· Status: approved` inline na linha `Change-id:`.
- O formato da POC (`Status: approved` em início de linha) continua
  aceito — compatibilidade com contratos congelados existentes.
- Fail-closed preservado: `· Status: draft|proposed|review` inline é
  recusado; menção a `· Status: approved` em prosa (fora de linha
  `Change-id:`) é recusada.

Fora de escopo: mudar o template SDLC, compat `tlc-spec-lean` (spike
declarado na POC), política de `.gitignore`.
