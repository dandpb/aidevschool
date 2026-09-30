# Plan: AID-3433-merge-gate-hardening

Author: FPE (agent fa8130d5) · Date: 2026-09-30 · Fast path normal
(artefatos colapsados: intent.md + este plan.md; despacho CEO AID-3432 é o
plano aprovado)

## Entregas mapeadas no despacho

| # | Entrega | Arquivo/superfície | Verificação |
| --- | --- | --- | --- |
| E1 | Subseção BINDING "Fallback CLI quando porta/API indisponíveis" (4 requisitos; motivação #607/`8975ba43` + série F-A #481→#607; cross-check escape hatch do header da porta) | `docs/sdlc/README.md` §Merge protocol item 7 (novo) | leitura cruzada header `merge_pr.sh` × novo texto; markdown consistente com seções vizinhas |
| E2 | Hint do protocolo de 4 itens no stderr no ramo de falha do merge via API (40x/5xx), antes de sair non-zero; porta continua a única via preferida | `scripts/merge_pr.sh` (função `fallback_hint` + chamada no §5 rc≠0 + casos no `--self-test`) | `bash scripts/merge_pr.sh --self-test` (novo grupo de casos: 4 itens + template canônico + pointer p/ docs); comportamento exit inalterado |
| E3 | Diagnóstico first-hand do 404 do `PUT /pulls/merge` (credencial `gho_`): `gh auth status`, `gh api user`, scopes (header `X-OAuth-Scopes`), permissões de repo, tentativa controlada em PR real (não-mergeável por checks — 405 vs 404 distingue autorização de proteção) | thread AID-3433 (recibo) | saídas citadas first-hand; conclusão (a)/(b)/(c) |
| E4 | Preparar ruleset "Require a pull request before merging" em `main` (escape hatch = edição da proteção, admin-only); APLICAR somente quando a precondição (credencial completa `PUT /pulls/merge`) estiver provada por merge bem-sucedido pela porta pós-incidente | JSON + comando documentados no recibo; ativação condicional | `GET /repos/…/rulesets` antes/depois se aplicado; se não aplicável, interação founder |

## Sequência

1. Branch `aid-3433/merge-gate-hardening` a partir de `origin/main`
   (`8975ba43`); artefatos intent/ commitados junto.
2. E1 + E2 no mesmo PR (bounded, disjuntos de runtime).
3. Self-test local da porta (`--self-test`) + revisão do diff.
4. PR único; tentativa controlada do merge API no PR ABERTO antes do
   countersign (E3: a resposta 405/404/403 é o dado diagnóstico; PR não é
   mergeado nessa tentativa).
5. Countersign independente via porta `scripts/countersign_assign.sh`
   (dedup AID-2844); merge pela porta única `scripts/merge_pr.sh` com linha
   canônica na merge msg (merge-writer ≠ produtor).
6. E4: só após merge bem-sucedido pela porta provar a precondição — aplicar
   ruleset e verificar; senão, interação founder com o diagnóstico E3.
7. Recibo AID-1516 (template `docs/sdlc/templates/receipt.md`) no carrier,
   com prova de árvore limpa no `_default` antes do flip `done`.

## Riscos / tradeoffs

- O ruleset E4 sem credencial funcional = stall founder-only (D3 explícito):
  mitigado pela precondição verificável.
- O hint E2 não deve enfraquecer a porta: texto explicita que o fallback
  exige os MESMOS gates e que editar proteção continua o único escape hatch
  mecânico (sem contradição com o header).
- Diagnóstico E3 usa PR real do próprio change (não cria PR descartável):
  a tentativa é read-only-equivalente (merge bloqueado por required checks no
  momento da tentativa) e não muta estado do PR.
