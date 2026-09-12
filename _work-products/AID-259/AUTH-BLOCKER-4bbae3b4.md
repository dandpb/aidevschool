# AID-259 — bloqueio de autenticação do board

- Revalidação: 2026-08-28 (UTC)
- Wake retomado após o run: `4bbae3b4-4540-48fc-867e-388113fb6ed1`
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

Sem autenticação no board, não é possível consultar os objetivos e tarefas atuais, criar tarefas-filhas, delegar trabalho ou atualizar a disposição de AID-259 no Paperclip.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente do agente.
2. Executar `rtk paperclipai whoami` e confirmar exit code `0`.
3. Reativar AID-259 para consulta e delegação das próximas tarefas.

## Disposição

`blocked` — depende de credencial administrada externamente.
