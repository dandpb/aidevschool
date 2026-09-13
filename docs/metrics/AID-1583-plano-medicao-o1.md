# AID-1583 — Plano mínimo de medição do funil O1 (n=5–8, até ~2026-09-23)

Dono: Learner Analytics Engineer. Companheiro da
[auditoria AID-1583](AID-1583-auditoria-instrumentacao.md) (mesma data).
Princípios: números antes de adjetivos; toda métrica com definição e fonte;
baseline honesto com zeros; **zero bloqueio de sessões** (nada muda nas
superfícies, nenhum tracker novo, nenhum deploy — boundaries ADR-0009/0010).

## 1. O que O1 pode e não pode medir (escopo honesto)

Com n=5–8 instalações/sessões e k≥5 imutável (AID-463 §3.0), **toda célula
agregada do relatório fica suprimida** — o valor verificável da janela é:

1. **Pipeline saudável** (coleta → sem drift → agregação roda → nenhum
   identificador publicado), e
2. **Contagens crus `n`** por seção/dia + **evidência manual** da ficha P6
   (a evidência de record do P6 é a ficha, não o funil —
   `docs/piloto/LEITURA_FUNIL_OPB.md:39-44`).

Métricas de taxa publicáveis só passam a existir com ≥5 instalações por
célula. Retenção cross-dia do literacy standalone não é mensurável
(auditoria G8).

## 2. Cadência de leitura (mata a lacuna G7)

| Leitura | Data alvo | O que prova | Quem |
| --- | --- | --- | --- |
| L1 health-check meio de janela | **2026-09-16** (janela 09-06→09-16) | Pipeline live capturando as sessões O1: `totalEvents` cresce entre exports, drift exit 0, `probeClassification` separa sondas | Founder/operador exporta (curl token-guardado, `LEITURA_FUNIL_OPB.md` §1); Analytics roda drift + agregação e publica work product |
| L2 fechamento | **2026-09-23/24** (janela 09-06→fechamento) | Baseline final O1: contagens por estágio do funil + ficha P6 consolidada | idem |

Export NUNCA é commitado; relatórios viram work products datados
(`_work-products/AID-<execucao>/funil-<data>.md`), NDJSON fica fora do repo.

## 3. Métricas mínimas (definição + fonte)

Cada métrica abaixo tem fonte verificável no relatório `aggregate_funnel.mjs`
(reportVersion 4) ou na ficha P6. Em n<5 reporta-se `n` e `suppressed`,
nunca taxa.

### 3.1 Saúde do pipeline (a cada leitura)

| Métrica | Definição | Fonte |
| --- | --- | --- |
| eventos aceitos | `totalEvents` pós-dedup por `eventId` no intervalo | cabeçalho do report |
| duplicados removidos | `duplicateEvents` (corrida beacon+fetch, ADR-0010) | cabeçalho |
| rejeitadas/ilegíveis | `rejectedEvents` + `parseErrors` | cabeçalho |
| drift | exit code do `schema_drift_monitor.mjs` (0=limpo) | saída do comando |
| sondas | contagens por marcador `probe.`/legados | seção `probeClassification` |

### 3.2 Funil literacy (por dia; sessão = page load)

| Estágio | Definição | Fonte |
| --- | --- | --- |
| entrada | sessões com `entry_viewed` (split da prop `entry`: home/lesson-resume/onboarding) | `literacyFunnel` + `activationDetail` |
| brief | sessões com `lesson_brief_viewed` | `briefExposure` |
| lição iniciada | sessões com `lesson_started` | `literacyFunnel` |
| 1ª atividade exposta | sessões com `activity_presented` | `briefExposure` |
| tentativa | sessões com `activity_attempted` | `literacyFunnel` |
| lição concluída | sessões com `lesson_completed` | `literacyFunnel` |
| segmentos de saída | saiu-no-brief × saiu-na-1ª-atividade × submeteu × resíduo-sem-brief; dwell bins `<15s/15-60s/1-5min/>5min` | `briefExposure` |

### 3.3 Funil OS (denominador de contexto)

| Estágio | Definição | Fonte |
| --- | --- | --- |
| onboarding started→completed | instalações por semana ISO | `activationFunnel` |
| missão started→completed | instalações por `missionId` | `missionCompletion` |
| atrito | `retry.requested`/`hint.requested` por missão; pass-rate por `activityType` | `activityFriction` |
| gate | `verification.state_changed` por estado | `verificationHealth` |

### 3.4 Evidência humana (primária em n<5)

| Métrica | Definição | Fonte |
| --- | --- | --- |
| sessões moderadas | presença × dia × participante | `docs/piloto/FICHA_P6.md` (facilitadora) |
| bloqueios/tempo/ritmo | checklist objetivo por participante | ficha P6 |
| retorno dia seguinte | anotação manual (pipeline não mede G8) | ficha P6 |

### 3.5 Baseline honesto (2026-09-06, única leitura existente)

| Métrica | Valor |
| --- | --- |
| eventos aceitos (09-06) | 3 |
| duplicados removidos | 1 |
| células de funil publicáveis | 0 (todas `suppressed (n=3 < k)`) |
| retenção R1/R7/R21 | suprimida (n=0 missões concluídas) |
| leituras entre 09-07 e 09-12 | **0** (gap G7) |

Fonte: `_work-products/AID-940/funil-2026-09-06.md`.

## 4. Regras de leitura (binding)

1. Célula `suppressed (n<k)` **não é** zero nem baixo — é não-publicável.
2. Citar denominadores (`6/17`), nunca só percentuais.
3. Funil mede **retorno à experiência**, jamais aprendizagem (`mastered`
   proibido em analytics — ADR-0009).
4. Excluir sondas da leitura só com `probeClassification` em mãos.
5. Reload do literacy = 2 sessões; cruzar `entry_viewed`/dia com as notas
   da moderação antes de concluir drop-off (`LEITURA_FUNIL_OPB.md:34-38`).

## 5. Fora de escopo (follow-ups com dono)

G1–G5 (cobertura de emissão PixelQuest/voxelDojo/dojoToday/miniTown/brief):
issue conjunta com o dono da engine, pós-O1. G8 (retenção literacy
standalone): emenda ADR-0009 se o board quiser medi-la — decisão de
privacidade, não de instrumentação.
