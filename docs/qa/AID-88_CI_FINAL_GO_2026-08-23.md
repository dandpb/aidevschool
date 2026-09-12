# AID-88 — parecer final da CI bloqueante

**Data UTC:** 2026-08-23  
**QA independente:** QA Lead  
**Disposição:** **GO** para AID-46 e AID-47, condicionado ao fluxo normal de aprovação/merge da PR #161.

## Escopo e charters de risco

1. **Integridade do estado do learner (crítico):** verificar que o job OpenClaw não modifica `learner/` nem sinaliza mastery.
2. **Evidência no SHA correto (crítico):** correlacionar PR, run e job com o mesmo head SHA.
3. **Bloqueio efetivo da main (crítico):** confirmar checks requeridos e regras sem bypass.
4. **Regressão do runner (alto):** executar unit tests e smoke read-only no SHA candidato, fora da workspace suja.

## Evidência executável

### GitHub Actions

- PR: [#161](https://github.com/dandpb/aidevschool/pull/161), head `73d108f3ec70a36967365b3d51580416d454345d`, base `main`, `MERGEABLE` e `BLOCKED` aguardando o fluxo de review.
- Run: [32627283147](https://github.com/dandpb/aidevschool/actions/runs/32627283147), conclusão `success`, head SHA idêntico ao da PR.
- Job: [openclaw (checklist runner)](https://github.com/dandpb/aidevschool/actions/runs/32627283147/job/97164428329), conclusão `success`:
  - `python -m pytest engines/openclaw/tests -q` → `23 passed in 0.27s`;
  - `python -m engines.openclaw --preview` → preview read-only com resultado `PASS`;
  - `test -z "$(git status --porcelain -- learner/)"` → sucesso, sem diff em `learner/`.
- Os quatro checks bloqueantes publicados no run concluíram `SUCCESS`: `literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)` e `product readiness (claims)`.

### Reprodução independente isolada

Ambiente: Linux, Python 3 local; worktree descartável no SHA `73d108f...`, sem usar ou modificar o estado canônico da workspace.

```text
python3 -m pytest engines/openclaw/tests -q
....................... [100%]
23 passed in 0.16s

python3 -m engines.openclaw --preview
OpenClaw checklist preview (read-only)
result: PASS — cycle complete

git status --porcelain -- learner/
(sem saída)

git diff --exit-code -- learner/
exit 0
```

## Proteção da main

Consulta `GET /repos/dandpb/aidevschool/branches/main/protection` em 2026-08-23:

- `strict: true`;
- exatamente quatro contextos requeridos: os quatro checks listados acima;
- `enforce_admins: true`;
- uma aprovação obrigatória, stale reviews descartados e last-push approval obrigatório;
- resolução de conversas obrigatória;
- force-push e deleção desabilitados.

A evidência anterior de AID-79 com PR #160 demonstrou que check requerido falho mantém o merge bloqueado; a configuração permanece coerente e ativa.

## Triagem e limitações

- **Defeito crítico AID-80: corrigido e verificado.** O modo `--preview` e o guard explícito impedem que o job verde oculte escrita em `learner/`.
- O log do job registra aviso no cleanup do `actions/checkout` sobre submódulo sem URL. É ruído de infraestrutura pós-check: não afetou testes, smoke, guard nem conclusão do job. Não é bloqueador deste parecer.
- A PR #161 ainda está aberta e `BLOCKED` pelo fluxo de revisão. O GO autoriza o avanço normal; não equivale a merge já realizado nem a validação de um futuro SHA de `main`.
- Este parecer valida a CI bloqueante e a não escrita em `learner/`; não declara mastery, paridade ou robustez geral do produto.

## Veredito

**GO final para AID-46 e AID-47.** Os critérios bloqueantes foram comprovados no SHA candidato e o bloqueador crítico de escrita em estado canônico foi removido. Após aprovação e merge da PR #161, recomenda-se apenas confirmar o run de `push` da `main` no SHA efetivamente integrado; qualquer mudança de SHA exige nova correlação.
