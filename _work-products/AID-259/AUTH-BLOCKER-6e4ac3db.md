# AID-259 — bloqueio de autenticação

Data da revalidação: 2026-08-28 (UTC)

Wake de origem: `6e4ac3db-8e9b-476b-aee6-245614c8ca69`.

Comando executado:

```text
rtk paperclipai whoami
```

Resultado:

```text
API error 401: Board authentication required
exit code: 1
```

Impacto: sem autenticação no board, AID-259 não pode consultar o portfólio atual, criar tarefas filhas, delegar trabalho nem registrar a mudança de status no Paperclip.

Responsável pelo desbloqueio: administrador do Paperclip.

Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` e confirmar exit code `0`; em seguida, reativar AID-259.

Observação: o erro de quota do modelo registrado no run de origem foi contornado pelo modelo desta execução e não é o bloqueio atual.
