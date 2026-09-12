# AID-259 — bloqueio de autenticação

- Data: 2026-08-28
- Wake de origem: `9f10b5be-bd4c-46f7-926f-5fc01007ea7c`
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`
- Disposição: `blocked`

## Responsável e ação de desbloqueio

O administrador do Paperclip deve restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` até obter exit code `0` e então reativar AID-259. Sem autenticação do board não é possível consultar objetivos, criar ou delegar tarefas, nem atualizar o status da issue pela API.
