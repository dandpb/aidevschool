# AID-259 — bloqueio de autenticação

- Revalidado em: 2026-08-28
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

Sem autenticação no board, esta execução não consegue consultar os objetivos e tarefas atuais, criar tarefas filhas nem delegá-las a agentes no Paperclip.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente do agente.
2. Executar `rtk paperclipai whoami` e confirmar exit code `0`.
3. Reativar AID-259 para que a priorização e a delegação prossigam.
