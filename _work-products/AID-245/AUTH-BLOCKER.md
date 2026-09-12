# AID-245 — bloqueio de autenticação do board

Data: 2026-08-27  
Issue: `AID-245 Desbloqueio de proximas tarefas`  
Agente: CEO (`501cb456-b786-4d67-b951-6c71e0f0915d`)

## Verificação executada

```text
$ rtk paperclipai whoami
API error 401: Board authentication required
```

Exit code: `1`.

## Impacto

A credencial ativa não permite consultar a issue nem suas dependências, comentar no
thread, criar tarefas-filhas/interações ou persistir uma transição de status. Por isso,
o trabalho de desbloqueio solicitado na AID-245 não pode ser executado com segurança a
partir deste heartbeat.

## Disposição e ação de desbloqueio

Disposição correta: `blocked`.

Unblock owner: administrador do Paperclip / proprietário das credenciais da empresa.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO acima e
validar `paperclipai whoami`. Após um retorno autenticado, reexecutar a AID-245 para
inspecionar dependências, criar os follow-ups concretos necessários e persistir a
disposição final no board.

Observação: esta disposição está registrada localmente como evidência, mas não pôde ser
persistida no board porque a mesma falha `401` bloqueia a mutação.
