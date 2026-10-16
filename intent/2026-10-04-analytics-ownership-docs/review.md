# Revisão independente R7 documental

Revisor: subagente `review_analytics_docs`, contexto separado do produtor,
2026-10-04. HEAD conferido: `b9f77774643b94bfd9fafbd756a1b17482c33e45`.
Alvos: página `docs/handbook/16_analytics_ownership.md` e única entrada R7
no índice. **Sem findings Blocker, Important ou Nit neste recorte.**
O parecer é consultivo; não autoriza publicação nem alterações de runtime.

## Passes e provas próprias

- **Correção vs plano:** li AGENTS raiz/docs, CLAUDE, REVIEW, documentação
  canônica, skill SDLC local e intent/spec/plan R7. A página cumpre os cinco
  critérios; orienta fontes existentes e não cria novo contrato ou autoridade.
- **Fontes/ownership:** conferi imports dos emissores OS v1, literacy v2 e
  surfaces v3; JSON é autoridade do vocabulário. Comparação read-only com
  `loadVocabularies` + `applyVocabularyBlocks` confirmou igualdade dos três
  blocos do collector canônico. A cópia OS staged está ausente; a página
  explica corretamente que `--check` não prova sua existência.
- **Collector/staging:** conferi `createAnalyticsBacking`/default handler,
  fallback de Blobs, exigência POST `sec-fetch-site: same-origin` e GET com
  token de operador. O script build-pilot copia fontes/pacote/lockfile/runtime,
  executa `npm ci` e modifica staging/build; o mapa aponta a projeção e não
  recomenda editar ou executar esses efeitos nesta checagem.
- **Offline e contratos distintos:** conferi leitor NDJSON, imports/retornos
  do monitor, preview limitado a 64 caracteres, piso k≥5 do agregador, leitura
  do catálogo e writes nos outputs explícitos. Conferi schemas/validador
  learner-events, exclusão de JSON de destino no migrador e inicialização
  PostHog em import de `learner/analytics.py`, inclusive imports dos dois CLIs.
  A separação analytics/evidência/mastery e config/decisão datada/live é fiel
  às fontes; configs e ADRs não foram tratados como prova de disponibilidade.
- **Evidência:** examinei os outputs já existentes do produtor e `evidence.md`,
  sem repetir refresh/monitor/agregador. Censo próprio das fixtures: OS 214,
  literacy 8, surfaces 4, total 226; coincide com `drift.json`, driftCount 0.
  O stdout textual do monitor corresponde ao uso de `--output`; stdout do
  agregador é idêntico a `funnel.json`, reportVersion 4 e kMinimum 5.
- **Links/escopo/convenções:** resolução própria dos 26 links da página:
  26 presentes. Remover a única linha R7 deixa o README byte a byte igual ao
  baseline pré-R7. Rehash próprio dos 6.374 arquivos anteriores: só README
  difere; 6.373 preservados, inclusive R5. `git diff --check` retornou 0 e a
  página nova não tem trailing whitespace. Sem segredos ou dados reais novos,
  sem duplicação de contratos; simplificação não demanda alteração.

## SHA-256 conferidos pelo revisor

| Artefato | SHA-256 |
| --- | --- |
| Página R7 | `32c12b3163cabc8d7d0b90324976b8ee43cd5d793f728dac74d3036def7e829a` |
| README após R7 | `80ae54c601457e4fb61407fbf73bdb45363635e4eab37d3661d425ba914aa638` |
| README baseline pré-R7 | `e86988ab3305b240aa3a95df6709df8b6361aba422d7de6bb4d3b3d2e56d3b01` |
| Inventário `before-r7-hashes.json` | `4ed900d347a915de3bf83312aa5c2cc0d6bf0f5534fdcd55fca86e2c3b763b23` |
| `drift.json` temporário | `3b3539e1aaf14496cc4bdd307dcd77a814c8cebde49426f0fa49df4571a8cf76` |
| `funnel.json` temporário | `e8c46f141f0404aa3556fba387b679148e65fc9838d9de7230066a0c7c27b6c3` |
| `funnel.md` temporário | `63f9fca948b63e01ac1ac9645baad5cee8081d08a2eee1a0cf16451d567bf3bb` |

## Limites

Somente este relatório foi escrito pelo revisor. Sem suites R5, import Python
analytics, refresh de escrita, build/staging, export real, probes, operações
externas, commit/push/PR/merge/deploy. Saídas temporárias sob
`/tmp/aidevschool-r7-evidence/`; exits dos comandos do produtor são atribuídos
ao registro dele, não a uma repetição independente. Esta revisão não certifica
segurança integral, inputs arbitrários ou serviço live. R2a e transporte dos
artefatos do Mac pertencem a trabalho separado, sem avaliação ou alteração
de testes aqui. Nenhum bloqueador remanescente para a entrega local R7.
