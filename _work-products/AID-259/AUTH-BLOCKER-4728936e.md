# AID-259 — bloqueio de autenticação

- Data: 2026-08-28 (UTC)
- Execução retomada: `4728936e-7675-4c38-a47b-bac23ae060eb`
- Verificação: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

O agente não consegue consultar o board nem criar, priorizar ou delegar as próximas tarefas de AID-259.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

Restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` e confirmar exit code `0`; depois reativar AID-259.
