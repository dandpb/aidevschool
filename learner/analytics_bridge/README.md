# learner/analytics_bridge — ponte emissores ↔ schema canônico (AID-5009)

Integra o schema canônico de eventos de aprendizagem
(`learner/analytics_events/schema.v3.json`, PR #621) aos emissores de
produto de `engines/literacyDojo` (envelope **v2**) e
`engines/codexdojo-os-prototype` (envelope **v1**), gerando um
**validador determinístico de funil e retenção**.

Pacote stdlib-only, offline, sem efeito em produção: não altera emissores,
coletor nem comportamento de engines (fronteira do papel Analytics:
telemetria e medição apenas).

## Camadas

| Módulo | Papel | Fonte das regras |
| --- | --- | --- |
| `vocabularies.py` | lê os MESMOS JSONs compartilhados dos emissores TS (`engines/shared/teaching-evidence/vocabularies/{literacy,os}.json`) — zero vocabulário copiado; drift falha fechado | vocabulários de fonte única |
| `envelopes.py` | validação estrutural espelhando os validadores TS (`literacyDojo/src/domain/analytics.ts:117-192`, `codexdojo-os-prototype/src/analytics/events.ts:179-191`) | emissores reais |
| `funnel.py` | observáveis do dicionário v1: dedup `eventId` (NC-1), funil por sessão (NC-2), retry por (sessão, lição) (NC-3), erro determinístico literacy / proxy OS (§erro), retomada só com prop `entry` | `learner/analytics_metrics/dictionary.yaml` |
| `retention.py` | R1/R7/R21 por `installationId` (cross-day = definição do dicionário; janelas = retorno em (1º dia + 1 .. 1º dia + W]); literacy = `not_measured` (G8, NC-8) | dicionário §retencao |
| `canonical.py` | projeção fail-closed para `schema.v3`, gating OBRIGATÓRIO por `learner/analytics_events/validate.py::validate_event`; matriz de cobertura com gap codes nomeados | schema v3 + dicionário |

## Rodar

```bash
python3 -m pytest learner/analytics_bridge/tests/ -q

python3 -m learner.analytics_bridge \
  --literacy learner/analytics_bridge/fixtures/synthetic/bridge-literacy-v2.ndjson \
  --os learner/analytics_bridge/fixtures/synthetic/bridge-os-v1.ndjson \
  --out-json /tmp/bridge.json
```

Feeds sem rótulo `synthetic: true` são recusados (NC-7) a menos que o
operador passe `--allow-real` (export real; nunca em fixtures do repo).

## Baseline honesto (fixtures sintéticas embarcadas)

| Número | Valor | Fonte verificável |
| --- | --- | --- |
| sessões literacy | 3 (visita ≠ pessoa; NC-2) | `compute_literacy` nos fixtures |
| tentativas / erros literacy | 3 / 1 · taxa `suppressed (n=3<k=5)` | idem (NC-5) |
| sessões-com-retry | 1 (par S1×l01) | idem (NC-3) |
| retenção literacy | `not_measured` — G8 | dicionário §retencao |
| instalações OS | 6 · onboarding 6→2 (taxa 0,3333, den=6≥k) | `compute_os` nos fixtures |
| tentativas OS | 3 submetidas · 1 passed · **2 erro-proxy** (sem attempt_id, TF-3) | dicionário §erro |
| retenção OS | cross-day 1/6 (0,1667) · R1=R7=R21=1 instalação | `compute_os_retention` |
| projeção canônica | literacy 3/10 eventos → `attempt_started`; OS 0/19 | `project_stream` + gate v3 |

## Matriz de cobertura canônica (resumo — máquina-legível em `canonical.mapping_matrix()`)

| Evento canônico (schema v3) | literacy v2 | OS v1 |
| --- | --- | --- |
| `objective_viewed` | gap `objective-id-not-emitted` | gap `objective-id-not-emitted` |
| `attempt_started` | **mapeável** de `activity_attempted` (proveniência campo a campo) | gap `mode-vocabulary-mismatch` + `attempt-id-not-guaranteed-uuid4` + `mission-id-not-guaranteed` + `verdict-attribution-co-occurrence` |
| `attempt_feedback_shown` | gap `latency-not-emitted` | gap `latency-not-emitted` + `verdict-attribution-co-occurrence` |
| `evidence_recorded` | gap `evidence-channel-separate` (ADR-0009) | idem |
| `export_consented` | gap `export-consent-not-instrumented` | idem |

Leitura obrigatória: a projeção é **conservadora** — campo canônico sem fonte
sonora BLOQUEIA a projeção e vira gap code; nenhum id, veredito ou tempo é
inventado ou reescrito. A única projeção sã hoje (tentativa do literacy)
usa `subject_anon_id = sessionId` com escopo **ephemeral-per-pageload**:
registros literacy nunca podem ser cruzados entre page loads (G8) e nunca
implicam pessoas.

## Achados da integração (auditoria bidirecional)

1. Nenhum emissor publica o 1º estágio canônico (`objective_viewed` exige
   `objective_id` + `entry`; `entry_viewed`/`onboarding.started` não têm).
2. Feedback canônico (`attempt_feedback_shown`) sem produtor: `latency_ms`
   não existe nos dois envelopes (família TF-1).
3. OS v1 não produz tentativa canônica: `mode` do OS
   (`initial|review|retry|targeted-practice`) não tem correspondência
   declarada com o enum canônico (`practice|assessment`), `eventId` OS não
   garante uuid4 e `missionId` é contexto opcional (TF-3).
4. Schema v3 não tem evento de CONCLUSÃO — `lesson_completed` /
   `mission.completed` não têm alvo canônico (o funil canônico acaba em
   feedback/evidência).
5. Retenção literacy é estruturalmente `not_measured` (G8); a decisão de
   board sobre installationId no literacy (emenda ADR-0009) é pré-requisito.

Follow-ups nomeados (dono em cada um): TF-1 (Learner App Engineer, issue
conjunta), TF-3 (Engine Systems Engineer), G8 (board/ADR-0009). CI: adicionar
`learner/analytics_bridge/tests` à lista de suites do `.github/workflows/ci.yml`
(1 linha, fica para o FPE — fora do escopo de escrita deste papel).

## Regras inegociáveis (herdadas)

Conclusão ≠ mastery (ADR-0009); analytics ≠ evidência; ausência é
`not_measured` com motivo — nunca zero (NC-8); célula n<k é `suppressed` —
nunca taxa (NC-5); nenhum PII (o validador canônico rejeita chaves
proibidas; os envelopes só aceitam primitivos limitados).
