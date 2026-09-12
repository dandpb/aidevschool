# AID-259 — bloqueio de autenticação

- Data: 2026-08-28
- Wake de origem: `23135e2e-d3a4-461a-9669-19748d186214`
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`
- Disposição: `blocked`

## Responsável e ação de desbloqueio

O administrador do Paperclip deve restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` até obter exit code `0` e então reativar AID-259. Sem autenticação do board não é possível consultar objetivos, criar/delegar tarefas ou atualizar o status da issue pela API.
