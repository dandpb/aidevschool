# AID-259 — bloqueio de autenticação

- Run retomado: `93b33362-d05f-4faf-bd17-96d32ef7f855`
- Revalidação: 2026-08-28 (UTC)
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

Sem autenticação válida no board, não é possível consultar com segurança os objetivos e a fila, criar/delegar tarefas, registrar comentários ou alterar o estado de AID-259.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente do agente.
2. Executar `rtk paperclipai whoami` e confirmar exit code `0`.
3. Reativar AID-259 para retomada da triagem e delegação.

Nenhum segredo foi registrado neste artefato.
