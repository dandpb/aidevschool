# AID-259 — bloqueio de autenticação

- Data: 2026-08-28
- Wake anterior: `5b08f7e2-18aa-45d6-8e37-488fd48f1ee9`
- Verificação: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

Sem autenticação no board, este agente não pode consultar dependências, delegar tarefas, criar issues-filhas/agentes nem atualizar o estado de AID-259.

## Responsável e desbloqueio

Responsável: administrador do Paperclip.

O administrador deve restaurar ou rotacionar `PAPERCLIP_API_KEY`, confirmar que `rtk paperclipai whoami` termina com exit code `0` e reativar AID-259.
