# Readiness re-grant runbook (anchor que sobrevive ao merge)

Registro operacional da classe de falha AID-1295 / AID-1265 (1º attempt):
**PR-head-verde ≠ merge-verde quando a main anda entre o re-anchor e o merge.**

## Por que acontece

- `product readiness (claims)` recalcula os fingerprints **da árvore corrente**
  (`tools/fingerprint.py`: sha256 por conteúdo de `sourcePaths` + canonical
  `policy.yaml`/`inventory.yaml`/`scenarios/*.yaml`). O gate é fail-closed de propósito.
- Um re-grant produzido contra a head X fica `stale` se o merge combinar a head do PR
  com uma main que recebeu mudanças em arquivos cobertos pelos fingerprints
  (ex.: PR #330 O3-C2 tocando `curriculum/ai-literacy/modules/03*`/`04*`,
  `engines/literacyDojo/src/`, `engines/codexdojo-os-prototype/src/data/missions.ts`
  entre o anchor v42 @ `9d5af73e` e o merge #328 @ `25c0232f`).

## Regra de merge (single-writer)

1. **Corte o branch do re-anchor na tip corrente da main** (`git checkout -b
   fpe/aid-XXXX-readiness-vN main`), nunca numa base antiga.
2. **Merge imediato**: nenhum outro PR pode aterrar na main entre o re-anchor e o
   merge deste. Se outra coisa aterrar, o push-run da main fica vermelho com `DRIFT`
   (falha correta do gate) e o re-anchor precisa ser regenerado.
3. **Antes de clicar em merge**, verifique o commit de merge previsto:
   `gh pr checks <N>` roda contra `refs/pull/<N>/merge` (árvore de merge real).
   Se a main andou depois dos checks, espere re-run e confira verde no merge ref.
4. O **push-run da main pós-merge é o verificador final** fail-closed; se ficar
   vermelho, registre bug e re-ancore (não relaxe o gate).

## Fluxo local de re-anchor (producer ≠ verificador)

```bash
# 1. Gates de producer na árvore corrente (mesmos argv dos cenários):
cd engines/literacyDojo && npm run test:e2e          # emite test-results/readiness/*.json
cd engines/codexdojo-os-prototype && npm run test:readiness  # pilot + trio + reports
# 2. Walks de observação (specs/config arquivados em evidence/observations/<id>/scripts)
# 3. Aggregate → assess → verificação:
python3 docs/product-readiness/tools/cli.py aggregate --reports <dirs...> \
  --observations docs/product-readiness/evidence/observations/<id> \
  --output <candidate>.json --assessment-id <id> --verified-at <ISO> --revalidate-by <DATE>
python3 docs/product-readiness/tools/cli.py assess --input <candidate>.json
python3 docs/product-readiness/tools/cli.py check      # exit 0 obrigatório no HEAD
python3 -m pytest docs/product-readiness/tests -q
```

- O aggregate com observações cobre **apenas** os use cases re-ancorados; cenários
  de outros use cases no mesmo diretório de reports viram decisões `blocked`
  (sem observação) e **derrubam** claims publicados — filtre os reports ao conjunto
  do re-anchor.
- CI nunca concede tier: o candidato automatizado só prova os fatos de producer;
  a concessão vive em `assessments/*.yaml` (contexto `independent-readiness-review`).

## Melhoria estrutural pendente (decisão CEO)

Branch protection "Require branches to be up-to-date before merging" forçaria
re-run dos checks quando a main anda, fechando a janela restante no PR em vez de
descobrir no push da main. Registrado como follow-up; o gate em si permanece
fail-closed.
