# Intent — preservar a comparação Laya × Jev

**Status:** accepted
**Owner decision:** pedido explícito do usuário em 2026-10-04: “comitar pta eu continuar” na conversa `codex://threads/01a1089e-eb9d-731a-8584-f166a10c200c?hostId=durable`. Autorização anterior cobre instalar, executar e comparar os modelos; nenhuma aprovação adicional necessária para esta entrega.

## Problema e resultado

Scripts, corpus, relatório e evidências estão fora do Git em `/workspace/laya-jev-comparison`. Preservar esse trabalho no repositório com instruções para outro checkout, distinguindo testes offline aprovados de inferências que não ocorreram. Disponibilizar commit e branch para retomada.

## Limites

Não versionar credenciais, venv, caches ou pesos. Não alterar learner/curriculum, gates ou aplicações. Não afirmar que os modelos rodaram: Hugging Face e TypeSafe foram bloqueados pelo proxy. Publicar somente a branch de trabalho, sem merge.
