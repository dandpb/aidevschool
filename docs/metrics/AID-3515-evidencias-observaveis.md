# AID-3515 — Evidências de aprendizagem observáveis (2026-09-30)

Dono: Learner Analytics Engineer (issue AID-3515). Companheiros:
[auditoria AID-1583](AID-1583-auditoria-instrumentacao.md) (G1–G8) e
[plano O1](AID-1583-plano-medicao-o1.md). Regra de ouro da casa: **certeza de
conclusão nunca vive no LLM** — e, no analytics, **conclusão nunca é mastery**
(ADR-0009). Nada aqui instrumenta produção: é dicionário versionado + cálculo
reproduzível sobre fixtures sintéticas rotuladas.

## 0. Artefatos desta fatia (todos verificáveis)

| Artefato | Papel |
| --- | --- |
| `learner/analytics_metrics/dictionary.yaml` | dicionário **v1**: observáveis, métricas (definição+fonte+fórmula), riscos de dupla contagem, limites de inferência, controles negativos NC-1..NC-8 |
| `learner/analytics_metrics/compute.py` | cálculo reproduzível (dedup por `eventId`, funil por sessão, retry, erro, retomada, transferência, supressão k≥5, guarda anti-mastery) |
| `learner/analytics_metrics/fixtures/synthetic/` | fixtures 100% sintéticas rotuladas (`synthetic:true` obrigatório; recusa sem rótulo) |
| `learner/analytics_metrics/examples/report-synthetic-v1.*` | exemplo de relatório gerado (byte-a-byte reproduzível, SHA-256 do JSON: `8c706c97…`) |
| `learner/analytics_metrics/tests/test_metrics.py` | 11 controles negativos (NC-1..NC-8 + 3 extras) — `python3 -m pytest learner/analytics_metrics/tests/ -q` → 11 passed |

## 1. Taxonomia do observável — visita ≠ tentativa ≠ conclusão ≠ transferência

Canal **analytics** = experiência (exposição, tentativa, retorno). Canal
**evidência** = desfecho avaliado por rubrica versionada (humano). Nenhum
canal emite `mastered` (ADR-0009; `learner/AGENTS.md`). Definições completas
com `ui_action`, fonte por campo e riscos: `dictionary.yaml §observables`.

| Observável | Definição curta | Canal · fonte hoje | Status |
| --- | --- | --- | --- |
| visita | 1 page load na entrada | analytics · `entry_viewed` (literacy) / `onboarding.started` (OS) | mensurável |
| tentativa | resposta submetida a atividade estruturada | analytics · `activity_attempted` / `structured_attempt.submitted` | mensurável |
| erro | tentativa com veredito fail | analytics · literacy `passed=false` (determinístico); OS **proxy** submitted-sem-passed | mensurável c/ ressalva OS |
| feedback | painel de feedback exibido | analytics · **não instrumentado** | **não medido (TF-1)** |
| retry | ≥2 tentativas na mesma (sessão, lição/missão) | analytics · derivação em `activity_attempted`; OS `retry.requested` | mensurável |
| conclusão | lição/missão concluída na sessão | analytics · `lesson_completed` / `mission.completed` | mensurável; **≠ mastery** |
| retomada | sessão que recomeça lição em curso | analytics · `entry_viewed.entry=lesson-resume` / `journey.returned` | mensurável |
| retenção | retorno cross-dia do mesmo sujeito | analytics · OS `installationId` cross-dia; literacy **impossível** (G8) | parcial |
| transferência | problema novo avaliado por rubrica v1 (T3) | **evidência** · rubricas tp-c01/tp-d01 (PR #619 @ `7259dbc5`, DRAFT) | **não medido** (0 aplicações reais) |

**Não-equivalências binding:** conclusão/simulação ≠ mastery; exemplo autoral
≠ resultado de aluno; código do assistente ≠ execução do aluno (tp-d01);
`score` de lição = progresso de experiência (ADR-0009:144-146), nunca domínio.

## 2. Mapa eventos → observáveis (o que existe, por envelope)

Vocabulários de fonte única: `engines/shared/teaching-evidence/vocabularies/
literacy.json` (10 eventos v2) e `os.json` (14 eventos v1) — projeções em
`engines/literacyDojo/src/domain/analytics.ts:44-48` e
`engines/codexdojo-os-prototype/src/analytics/events.ts:12-27`.

- **literacy v2** cobre: visita (`entry_viewed`+`entry`), brief
  (`lesson_brief_viewed`), exposição (`activity_presented`), tentativa+erro
  (`activity_attempted.passed`), conclusão (`lesson_completed`), revisão
  (`review_started/completed`), retomada (`entry=lesson-resume`). Retry é
  derivação (≥2 tentativas mesmo par sessão-lição) — sem evento próprio, por
  design (emenda AID-0009 AID-913:179-181).
- **OS v1** cobre: onboarding started/completed, `journey.returned`,
  missões started/completed, tentativa submetida/aprovada, `retry.requested`,
  `hint.requested`, `verification.state_changed`.
- **Público dev × cotidiano**: o funil profundo do cotidiano é o literacy
  (7 estágios); o dev tem hoje 1 degrau público (`daily-view-open` no
  dojoToday, G3) + missões do OS como denominador compartilhado; tp-d01 é o
  primeiro desfecho de transferência do dev e tp-c01 do cotidiano — ambos
  fora do analytics, no canal de evidência (separação correta: rubrica é
  avaliação humana versionada, não telemetria).

## 3. Lacunas de inferência (herdadas + novas)

Herdadas da auditoria AID-1583: **G3** funil dev raso, **G6** k≥5 × n=5–8
(toda taxa suprimida na janela), **G7** cadência de leitura, **G8** retenção
literacy inobservável (decisão de board via emenda ADR-0009, não de
instrumentação). Novas desta fatia (numeradas TF):

| # | Lacuna | Consequência no relatório |
| --- | --- | --- |
| TF-1 | nenhum envelope tem `feedback_shown` (feedback de UI é transitório) | taxa de feedback = not_measured; proxy parcial = erro/tentativa |
| TF-2 | transferência (rubrica) não tem registro padronizado nem vínculo opcional a sessão/anon-id | métricas de transferência só nascem quando aplicações reais existirem; fixtures demonstram o formato do registro |
| TF-3 | OS v1 não tem `attempt_id` nem evento de veredito negativo | erro do OS é sempre proxy qualificado; N submissões da mesma etapa são indistinguíveis |

## 4. Reproduzir o cálculo (fixtures sintéticas rotuladas)

```
python3 learner/analytics_metrics/compute.py \
  --fixtures learner/analytics_metrics/fixtures/synthetic \
  --out-json /tmp/r.json --out-md /tmp/r.md
python3 -m pytest learner/analytics_metrics/tests/ -q   # 11 passed
```

Exemplo de saída (commitido em `examples/report-synthetic-v1.md`):
funil literacy 5→2→2→1→2→2 sessões; 3 tentativas / 1 erro determinístico /
1 retry; taxa de erro `suppressed (n=3<k=5)`; OS 2 instalações, 1 erro-proxy
qualificado; transferência: 3 aplicações sintéticas, 1 exemplo autorial
**excluído**, aplicações reais = 0; retenção literacy = não medido (G8).
Nenhuma métrica inventada: toda célula tem fonte no dicionário; ausência =
`not_measured`, nunca zero.

## 5. Baseline real honesto (dados reais já acessíveis/autorizados)

| Métrica real | Valor | Fonte |
| --- | --- | --- |
| leituras de funil publicadas | **1** (2026-09-06) | `_work-products/AID-940/funil-2026-09-06.md` (único `funil-*` no repo) |
| eventos aceitos naquela leitura | 3 (todas as células suprimidas n<k) | idem |
| leituras 09-07 → hoje | **0** | ausência de `funil-*` posteriores |
| aplicações reais de rubrica tp-c01/tp-d01 | **0** | PR #619 DRAFT, teste com alunos pendente (README §1) |
| todo o resto deste dicionário | **não medido** | §not_measured do report |

Nenhum dado real além disso foi usado; nenhum PII/token exportado (exportação
exige token de deploy, `docs/piloto/LEITURA_FUNIL_OPB.md:50-58`).

## 6. Próxima instrumentação mínima (proposta, com dependências — nada feito)

1. **Cadastro do registro de aplicação de rubrica** (TF-2, dono: Curriculum
   Content Engineer + Analytics): NDJSON `transfer_outcome` no formato das
   fixtures, versionado com a rubrica — **pré-requisito**: PR #619 aprovado e
   1ª aplicação real; sem isso, transferência segue not_measured.
2. **Evento `feedback_shown`** (TF-1, dono: Learner App Engineer, issue
   conjunta): 1 evento por (tentativa, sessão) nos dois envelopes via emenda
   ADR-0009 — fecha o elo tentativa→feedback do modelo pedagógico.
3. **`attempt_id` no OS v1** (TF-3, dono: Engine Systems Engineer):
   correlaciona submitted↔veredito e despromove o erro de proxy a observável.
4. **Leitura de funil L3** (G7, dono: founder/operador exporta): a janela
   09-06→hoje segue sem leitura; 1 export + `compute.py` sobre o NDJSON real
   (mesmo código, rótulo `synthetic:false` recusado aqui — pipeline real usa
   `aggregate_funnel.mjs` reportVersion 4).

Congelamentos preservados: PRs #610–#616 intocados; #616 permanece publicado;
sem merge/deploy (PR próprio é draft até a revisão formal).

## 7. Revisão formal (pendência deste artefato)

**Reviewer: Learner App Engineer** — conferir a coluna `ui_action` do
`dictionary.yaml §observables` contra os emissores reais
(`engines/literacyDojo/src/domain/analytics.ts`,
`engines/codexdojo-os-prototype/src/analytics/`): cada evento declarado
dispara no momento de UI descrito? Resposta esperada no PR (draft) desta
fatia. QA Lead pode reaproveitar os NC como casos de teste de coleta.

## Fontes / SHAs

- Repo main @ `d9dbdd5c` (base da fatia); PR #619 (práticas tp-c01/tp-d01,
  rubricas v1) @ `7259dbc5` — DRAFT, não mesclado.
- ADR-0009 (`docs/design/adr/0009-product-analytics.md`), ADR-0010
  (`docs/design/adr/0010-os-analytics-collector.md`), AID-463 §3.0 (k≥5).
- Vocabulários: `engines/shared/teaching-evidence/vocabularies/{literacy,os}.json`.
- Exemplo sintético reproduzível: SHA-256 do JSON regenerado = igual ao
  commitido (`8c706c9788f94cec…` — verificado nesta fatia).
