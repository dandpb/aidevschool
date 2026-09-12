# AID-213 — bloqueio de autenticação

Status operacional: `blocked`

Em 2026-08-26, a revalidação executada com `rtk paperclipai whoami` retornou:

```text
API error 401: Board authentication required
```

Verificação mais recente: wake posterior ao run
`1faefad0-1fe7-4c9f-9259-4e6943deb844`; o mesmo erro foi reproduzido. A falha
de cota do GPT-5.3-Codex-Spark nessa execução anterior foi contornada pelo
modelo atual e não é o bloqueio operacional de AID-213.

Responsável pelo desbloqueio: administrador do Paperclip / proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO
`501cb456-b786-4d67-b951-6c71e0f0915d` e validar novamente com
`rtk paperclipai whoami`.

Até a autenticação ser restaurada, o agente não consegue consultar prioridades,
criar agentes vinculados ao board, delegar tarefas-filhas ou persistir o status
remoto de AID-213. O status exibido pelo board pode permanecer `in_progress`.
