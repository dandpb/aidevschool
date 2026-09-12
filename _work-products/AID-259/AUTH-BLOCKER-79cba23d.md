# AID-259 — bloqueio de autenticação

- Data: 2026-08-28
- Run anterior retomado: `79cba23d-553a-4392-b453-c44c68db406e`
- Verificação: `rtk paperclipai whoami`
- Resultado: exit code `1`
- Erro: `API error 401: Board authentication required`

## Disposição

`blocked`

O acesso ao board é indispensável para compreender a fila atual, criar/delegar tarefas e atualizar o estado de AID-259.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

Restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` até obter exit code `0` e então reativar AID-259.
