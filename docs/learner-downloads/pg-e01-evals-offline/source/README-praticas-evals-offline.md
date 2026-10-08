# curriculum/praticas-evals-offline — autorias de evals offline (AID-3648)

Diretorio autoral **novo e isolado** (Learner Analytics Engineer) para a
lacuna U13/D5 da sequencia Dev guiada. Nao altera projetos numerados do
`catalog.md`, engines, runtime, catalogo/bindings/lessonIDs, progresso,
mastery, defaults ou gates. Nao e engine nova; e pacote de conteudo no
formato das praticas guiadas existentes (pg-d01/pg-d03, tp-*).

## Pacote

- `pg-e01-evals-offline/` — pratica guiada U13 (D5): o aprendiz congela
  criterios ANTES de comparar duas saidas de modelo (A=prompt v1 vs
  B=prompt v2), descobre melhora agregada escondendo fatia que piorou,
  propoe correcao de prompt (v2.1) e testa casos NOVOS (heldout).
  Exemplo trabalhado com fixture sintetica distinta (TrilhaFit),
  tentativa em cenario diferente (helpdesk PrismaDesk), metricas
  reproduziveis (scorer deterministico `metricas.py`), feedback/retry
  por rubrica, takeaway, e guia/gabaritos do professor SEPARADOS em
  `guia-de-correcao/`. Todos os dados/saidas rotulados SINTETICOS
  (check deterministico incluido). Sem rede/API/credenciais/PII.

Verificacao local (sem rede), a partir do diretorio do pacote:

```sh
cd curriculum/praticas-evals-offline/pg-e01-evals-offline
python3 insumos/fixture/metricas.py comparar \
  --casos insumos/fixture/casos_base.json \
  --A insumos/fixture/saidas_A_base.json --B insumos/fixture/saidas_B_base.json
# VEREDITO: agregada +0.042 COM regressao de fatia: pagamento (-0.500, n=6)

python3 guia-de-correcao/testes.py   # 9 checks determinísticos (pos+neg)
```

## Fontes curadas (pins resolvidos ANTES da autoria — 2026-10-01)

| Fonte | Pin | Papel |
| --- | --- | --- |
| `curriculum/sequencia-dev-guiada/SEQUENCIA.md` (branch `aid3510/sequencia-dev-guiada`, PR #620 draft) | blob `a7c8f05f270a4c3151fdfa6984e74f2b3cb87f2f` | Declaracao da lacuna U13 §3P3 e da sequencia U01–U14 |
| `docs/curso-simples/index.html` §9 (M9 Loop Engineering) @ `main` `86fca779` | blob `2bcf99fbd83165f1fd769d90eda44980fc12fc8f` | Fonte parcial (insuficiente p/ pratica executavel, segundo SEQUENCIA §3P3) |
| `curriculum/ai-literacy/modules/03-avaliar-e-verificar/l11-como-comparar-alternativas.yaml` @ `main` | blob `cf370d228d02f8deb5d89c79daf86e1380de0ad9` | Ancia de comparacao estruturada de alternativas |
| `curriculum/ai-literacy/modules/03-avaliar-e-verificar/l08-a-primeira-resposta-nao-e-a-melhor.yaml` @ `main` | blob `cc0ae70259a1b7c9afb8144a3ca90295547e26a0` | Ancia de iterar/verificar saidas |
| `docs/curso-simples/ROADMAP.md` @ `main` | blob `5dc6f72ce50549fa9063e04e438011bb48419d96` | M9 no plano do curso (checkbox de leitura) |

Base de ramificacao: `origin/main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0`.

## Deduplicacao (reconfirmada no checkout — 2026-10-01)

- Busca na arvore de trabalho (`heldout|held-out|evals offline`): sem
  pacote equivalente (unico hit: relatorio de mutation testing do
  projeto 02, fora de escopo).
- 31 PRs abertos inspecionados: #620 declara a lacuna (pg-d01=U06),
  #631/#641 pg-d02 (U03), #633 pg-d03 (U07), #635/#636/#639 pg-c01
  (cotidiano), #619 tp-c01/tp-d01 — **nenhum** cria pratica de avaliacao
  de saidas de modelo.
- PR #621 (AID-3515, analytics de EVENTS de aprendizagem) e
  deliberadamente NAO duplicado aqui: nesta pratica o aprendiz avalia
  SAIDAS DE MODELO em fixtures sinteticas.

## Contrato congelado para o gate V&E

`pg-e01-evals-offline/MANIFEST-AID3648.md` lista SHA256 de cada arquivo
do pacote (dados, scorer, checks, gabaritos). O gate independente de
prova executavel (a ser despachado pelo PO) deve reproduzir os comandos
do README/solucao.md contra esses hashes.

## Anti-escopo (AID-3648)

- Diff restrito a este novo diretorio (pacote/fixtures/checks/manifesto).
- Nao muda originais, engines/player/catalogo/bindings/lessonIDs/
  progresso/mastery/defaults, runtime/gates, PRs congelados.
- Sem API live, credenciais, rede de avaliacao, PII, nova engine,
  merge/deploy/retarget/restart. Draft PR; sem merge por quem autora.

## Provenance

- Produtor: Learner Analytics Engineer (agente `803ca017-7544-444b-b434-4865b8dc5fc7`),
  tarefa AID-3648, worktree propria `aid3648/u13-evals-offline`.
- Todas as saidas citadas nos docs foram executadas nesta arvore
  (Python 3.13, stdlib apenas, sem rede) — ver `guia-de-correcao/solucao.md`.
- Revisao: CPE (dominio curricular) → CD (aprovacao pedagogica), conforme
  politica de execucao da issue; gate V&E independente apos congelamento.
