# Evidência R7 documental

Produtor: sessão Codex Cloud delegada pelo Dani. Checks executados em
2026-10-04 até 14:26:05 UTC, no HEAD `b9f77774643b94bfd9fafbd756a1b17482c33e45`.
Revisão independente pertence a `review.md`; este arquivo não emite seu veredito.

## Comandos efetivamente executados (raiz do repositório)

```sh
node learner/gate/analytics/refresh_vocabularies.mjs --check
node learner/gate/analytics/schema_drift_monitor.mjs \
  --input learner/gate/tests/fixtures/analytics/synthetic,learner/gate/tests/fixtures/analytics/synthetic-v2,learner/gate/tests/fixtures/analytics/synthetic-v3 \
  --output /tmp/aidevschool-r7-evidence/drift.json
node learner/gate/analytics/aggregate_funnel.mjs \
  --input learner/gate/tests/fixtures/analytics/synthetic,learner/gate/tests/fixtures/analytics/synthetic-v2,learner/gate/tests/fixtures/analytics/synthetic-v3 \
  --now 2026-09-18T00:00:00.000Z \
  --output /tmp/aidevschool-r7-evidence/funnel.json \
  --markdown /tmp/aidevschool-r7-evidence/funnel.md
git diff --check
```

Todos retornaram **0**, sem stderr. Node observado: v24.19.0. Refresh check
não produziu output; a inspeção do código confirmou que compara somente alvos
legíveis/presentes e não escreve nesse modo. Nenhuma suite de R5 foi repetida.

| Observável | Resultado |
| --- | --- |
| Monitor JSON | monitorVersion 4, totalLines 226, validEvents 226, OS 214, literacy 8, surfaces 4, driftCount 0. |
| Aggregate JSON/Markdown | reportVersion 4; generatedAt `2026-09-18T00:00:00.000Z`; ambos os outputs não vazios. O campo source do funil OS relata totalEvents 212, duplicateEvents 2, rejectedEvents 0 e parseErrors 0; as outras famílias têm seções próprias. |
| Links | Script Python ad hoc resolveu 29 links em mapa/intent/spec/plan; todos os alvos locais existem. |
| Índice | A comparação com `/tmp/aidevschool-r7-evidence/handbook-before-r7.md` retorna igualdade ao remover a única linha `[Analytics ownership](16_analytics_ownership.md)`. Entrada R5 preservada. |
| Whitespace | `git diff --check` exit 0; script ad hoc conferiu também trailing whitespace nos quatro novos Markdown. |
| Preservação | Inventário SHA-256 pré-R7 inclui 6.374 conteúdos rastreados e artefatos R5. Somente README mudou; 6.373 conteúdos permanecem iguais. Inclui fonte, estado, testes, proteções, quatro documentos R1/R8 e página/recibos R5. |

Os checks Python foram executados por stdin, sem teste persistente novo. Outputs,
stdout/stderr e hashes estão em `/tmp/aidevschool-r7-evidence/`.

## Hashes da entrega e prova

| Artefato | SHA-256 |
| --- | --- |
| `docs/handbook/16_analytics_ownership.md` | `32c12b3163cabc8d7d0b90324976b8ee43cd5d793f728dac74d3036def7e829a` |
| `docs/handbook/README.md` após R7 | `80ae54c601457e4fb61407fbf73bdb45363635e4eab37d3661d425ba914aa638` |
| `intent.md` | `00c17a1e7d0e2bf7c1cee7d59add12bb86e595f1674203b957a45d6ea71689db` |
| `spec.md` | `84004d58deeb592fd192fce787c532bc231c4e3c1b016a70f6ab4ee0688d187a` |
| `plan.md` | `4cf7359452106ff1f4468be117de5c4d65a47d446f8c33ac473b9989eecc0475` |
| `drift.json` temporário | `3b3539e1aaf14496cc4bdd307dcd77a814c8cebde49426f0fa49df4571a8cf76` |
| `funnel.json` temporário | `e8c46f141f0404aa3556fba387b679148e65fc9838d9de7230066a0c7c27b6c3` |
| `funnel.md` temporário | `63f9fca948b63e01ac1ac9645baad5cee8081d08a2eee1a0cf16451d567bf3bb` |

## Limites

Checks demonstram a leitura offline documentada e preservação de arquivos;
não atestam deploy live, coleta real, privacidade de inputs arbitrários ou
segurança integral dos runtimes. Não houve refresh de escrita, build/staging,
import do SDK Python, requisição ao collector ou export de dados reais.
Nenhum commit, push, PR, merge ou deploy. Artefatos locais sem publicação.
