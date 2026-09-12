# AID-259 — bloqueio de autenticação

- Wake/run de origem: `1c1bfaed-cb7d-4125-8347-1cf5cb51d550`
- Revalidação: 2026-08-28 (UTC)
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Disposição

`blocked`

O limite do modelo foi contornado no run atual. O bloqueio ativo é a autenticação do board, que impede consultar dependências, delegar tarefas, criar issues-filhas/agentes e atualizar o status de AID-259.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` para esta instância.
2. Confirmar `rtk paperclipai whoami` com exit code `0`.
3. Reativar AID-259 para que a priorização e a delegação prossigam.
