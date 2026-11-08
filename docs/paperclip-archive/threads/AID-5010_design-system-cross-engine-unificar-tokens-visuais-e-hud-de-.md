# AID-5010: DESIGN SYSTEM CROSS-ENGINE: Unificar tokens visuais e HUD de progresso entre codexdojo-os-prototype, literacyDojo e dojoToday

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-10-17T16:22:01.854895+00:00 | **Updated:** 2026-11-01T14:11:44.867+00:00
- **ID:** `922d14b1-dc25-4aa0-8793-814d7d421389`

## Description

Alinhar `DESIGN.md` e os componentes de feedback de progresso/mastery/FSRS entre `codexdojo-os-prototype`, `literacyDojo` e `dojoToday`, garantindo consistência visual, contraste AAA e responsividade.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-5010 — DESIGN SYSTEM CROSS-ENGINE: Unificar tokens visuais e HUD de progresso entre codexdojo-os-prototype, literacyDojo e dojoToday
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 27b11929-a402-4a68-9fc7-b757dff49323
- Agent: CEO (opencode_local)

## Objective

Alinhar `DESIGN.md` e os componentes de feedback de progresso/mastery/FSRS entre `codexdojo-os-prototype`, `literacyDojo` e `dojoToday`, garantindo consistência visual, contraste AAA e responsividade.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `27b11929-a402-4a68-9fc7-b757dff49323` finished with status `succeeded` at 2026-10-20T05:02:48.916Z.
- Wake: `issue_children_completed` — **a cadeia de closure inteira fechou**: AID-5197 (citação #729) `done`, AID-5198 `done` (**PR #730 changelog §6 MERGED** @ `c3a66706`, QA AID-5200 GO), AID-5199 `done` (**PR #729 MERGED** @ `f3022b9f`, gate LIVE PASS, main verde). É a rodada de fechamento do carrier. Verificação final first-hand antes do `done`:

Verificação final first-hand completa:

- **Main HEAD `f3022b9f`** = merge do PR #729 (04:52:11Z) — lote W7 fechado por último
- **#729 e #730 MERGED**; **main CI: 0 falhas**
- **§6 no main**: W5/W6/W7 todas "done" com merges+countersigns (nota menor: célula W7 diz "#729 em observação" — historicamente exata quando o #730 foi escrito; o fechamento do lote está registrado no próprio PR #729 e no board)

Todos os artefatos do objetivo têm countersign QA independente. Postando o dossiê final e fechando o carrier:

**AID-5010: `done`** (completedAt 05:02:42Z, dossiê `cba37ed3` na thread, verificação GET confirmada)

O carrier do design system cross-engine fechou com a cadeia completa de entrega:

- **Ondas W4→W7** todas mergeadas com countersign QA independente (AID-5143, AID-5173, AID-5187, AID-5195) — contraste AAA, toke
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `doc/intera`

## Commands Run

- Heartbeat run `27b11929-a402-4a68-9fc7-b757dff49323` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Document `Plano AID-5010 — Fundações v2.0 (HUD progresso/mastery/FSRS) + adoção` (2026-10-18)

# AID-5010 — Plano: Fundações de design v2.0 (HUD de progresso/mastery/FSRS) + adoção

**Autor:** System Designer · **Data:** 2026-10-17 · **Status:** proposta — aguarda confirmação da board
**Contrato estendido:** `docs/design/design-foundations.md` v1.0 → v2.0 (§2.4: contrato é mantido pelo SD; adoção como política é da board)

## 0. Resumo executivo

A auditoria dos HUDs de progresso/mastery/FSRS nas três engines (`codexdojo-os-prototype`, `literacyDojo`, `dojoToday`) encontrou: **(a)** 2 defeitos AA vigentes (violam a política B2/block atual, sem depender desta proposta), **(b)** uma lacuna AAA sistemática — todos os 13 pares de texto medidos nos HUDs ficam entre 3.30:1 e 6.78:1, nenhum atinge 7:1, e **(c)** três anatomias e três paletas semânticas diferentes para os mesmos papéis (streak, progresso de trilha, mastery, revisão FSRS).

Proposta: estender `design-foundations.md` para **v2.0** com §7 (Contrato do HUD de progresso): 10 tokens `--ads-*` novos (mapeamento, não igualdade de valores), anatomia canônica de 4 papéis, tier de acessibilidade **B9 (AAA 7:1 nos textos do HUD, 3:1 não-texto)**, regras de responsividade e de bounded context. Adoção em 4 ondas (W4 defeitos AA → W7 componentes), cada uma com countersign de QA independente, seguindo o padrão W0–W3.

## 1. Inconsistência observada e evidência

### 1.1 Inventário dos HUDs (mesmo papel, três implementações)

| Papel | dojoToday | literacyDojo | codexdojo-os-prototype |
| --- | --- | --- | --- |
| Streak | `streak-card` com chama-emoji acesa/apagada + manchetes + freezes (`role="group"`, `aria-label` na `<section>`) | pill `.stat` "Sequência: N dias" + pill XP + meta diária (`aria-label` no texto da meta) | `topbar-stats` "🔥 N dias" (lucide `Flame`) + "N dominadas · M preparadas" |
| Progresso de trilha | `progress-card` com `role="progressbar"` (aria-valuenow/min/max/valuetext "N% concluído") + "X/Y dominadas · verificadas por gate" | `.progress-track` `role="progressbar"` + `.progress-fill` gradiente (HomeScreen) + listas em ProgressScreen | `honest-progress` (3 col), `progress-summary` (4 cards), `progress-explainer` (5 artigos) — **nenhum `role="progressbar"`** |
| Mastery/estado | `.track-node.is-mastered` (glifo ✅ em par soft+deep + riscado + aria "concluída/ativa/disponível") | texto "completed ≠ mastered" (ResultScreen/ProgressScreen); `lessonStatus` completed | `mission-map-node.completed/.verified/.canonical-mastery` (wash primary-soft) + estados canônicos presenting/practicing/evaluating/mastered |
| FSRS/revisão | cards de revisão `reason` overdue/due + `.due-in` "overdue 43d", tom danger/trap/success | `reviews-due`/`reviews-upcoming` (ProgressScreen) + `card-review` (HomeScreen) | **não exibe FSRS** |
| Fundação de tokens | 5 aliases `--ads-*` (W2) | 5 aliases `--ads-*` (W2, formato de referência) | apenas `--ads-focus` (sem pares success/error) |

Evidência de leitura: `engines/dojoToday/src/main.ts` (`streakCard`, `progressCard`, `trackSection`), `src/styles.css`; `engines/literacyDojo/src/screens/HomeScreen.tsx`/`ProgressScreen.tsx`/`ResultScreen.tsx`, `src/styles.css:816–853`; `engines/codexdojo-os-prototype/src/desktop/DesktopChrome.tsx:51–56`, `src/styles/desktop.css:21–47`, `src/styles/journey.css`, `src/styles/foundation.css`.

### 1.2 Medição de contraste (WCAG relativo; produtor SD, 2026-10-17; QA re-medirá por amostra independente)

Todos os pares de **texto** dos HUDs hoje passam em AA ou falham pouco abaixo — e **nenhum** atinge AAA 7:1:

| Engine | Par (uso no HUD) | Hoje | AA 4.5 | AAA 7.0 |
| --- | --- | --- | --- | --- |
| dojoToday | chip `.tone-success` (branco #ffffff sobre #16a34a) | **3.30** | **FALHA** | falha |
| OS journey | `--school-muted` #657089 sobre `--school-primary-soft` #e5f2eb (nós completed/verified/canonical-mastery) | **4.31** | **FALHA** | falha |
| dojoToday | `--muted` #686378 sobre `--line` #ece6f5 (`.track-glyph`) | 4.72 | passa | falha |
| literacy | `--muted` #657089 sobre `--bg` #f8f4ea | 4.52 | passa | falha |
| OS journey | `--school-muted` sobre `--school-paper` #f8f4ea | 4.52 | passa | falha |
| literacy | par stat-done #14734d sobre #e8f8ef | 5.32 | passa | falha |
| dojoToday | `--muted` sobre `--bg` #fdf6ec / card #ffffff / grad-b #f3e9ff | 5.37–5.76 | passa | falha |
| dojoToday | eyebrow `--primary` #4f46e5 sobre `--bg` | 5.86 | passa | falha |
| dojoToday | `--ink-soft` #5b5570 sobre gradiente do streak #fff7ed | 6.64 | passa | falha |
| dojoToday | glifo mastered #166534 sobre #dcfce7 (AID-1027/W1) | 6.49 | passa | falha |
| OS dark | `--muted` #8f9bb0 sobre `--panel-solid` #0d1525 / `--bg` #07101f | 6.50–6.78 | passa | falha |
| literacy | `--muted-strong` #4f5a75 sobre `--bg` | 6.27 | passa | falha |
| OS journey | `--school-muted` sobre branco (progress-summary/missions small 0.7rem) | 4.96 | passa | falha |

Não-texto (WCAG 1.4.11, mínimo 3:1): `progress-fill` da literacyDojo termina em #0ea5e9 sobre trilha #e5e9f0 = **2.28 — falha** (a extremo cyan do gradiente); início indigo #4f46e5 = 5.16, passa. Chama do dojoToday #f59e0b sobre #fff7ed = 2.02 (decorativa, `aria-hidden`; o estado lit/out é transmitido por texto — conforme B3).

### 1.3 Defeitos AA vigentes (bloqueiam já pela política atual B2 — independentes desta proposta)

1. **dojoToday** `.tone-success .chip`: texto branco sobre `--success` #16a34a = **3.30:1** (texto de 0.72rem ≈ 11.5px — texto normal no critério WCAG; requer ≥4.5). Chips idênticos nos tons danger (4.70) e trap (5.70) passam por pouco — o par success é o único defeito.
2. **OS journey** `mission-map-node` nos estados `.completed/.verified/.canonical-mastery`: `p` e `div > span` usam `--school-muted` #657089 sobre o wash `--school-primary-soft` #e5f2eb = **4.31:1**.

### 1.4 Divergências sistemáticas

- **Tokens semânticos ausentes:** nenhum token de HUD existe no contrato (0/10 papéis); as 3 engines usam pares semânticos distintos para o mesmo conceito (success literacy #14734d/#e8f8ef vs dojoToday #166534/#dcfce7 vs OS journey wash primary-soft) — 3 visualizações diferentes de "dominado".
- **Anatomia:** streak = emoji vs pill vs ícone lucide; progresso = bar+aria completa (dojoToday, literacy) vs grids sem `role="progressbar"` (OS); mastery = glifo+riscado vs texto explicativo vs wash de fundo; FSRS = cards vs listas vs ausente.
- **Responsividade:** OS desktop-first (100dvh, min 320px, verificação 375/768/1280); literacy mobile-first (alvos 44–48px); dojoToday mobile-first coluna única `max-width: 30rem`. Nenhuma regra compartilhada de empilhamento do HUD.
- **A11y funcional:** `role="status"`/`aria-live` presente no feedback do loop (W3), mas mudanças de streak/revisão não são anunciadas em nenhuma engine; OS tem foco ≥44px só em `.journey-page`.

## 2. Impacto

- **Aprendiz:** os três produtos são faces da mesma escola, mas "quantas domino / o que reviso hoje / minha sequência" aparecem com três gramáticas visuais e três vocabulários ("concluída" vs "dominadas" vs "verificadas"); 2 defeitos AA penalizam leitura em telas de baixo contraste; AAA no HUD beneficia o uso diário rápido (glanceability) e a audiência envelhecida/mobile.
- **Engenharia:** sem contrato, cada HUD novo reinventa pares semânticos e reproduz os mesmos defeitos de contraste; os testids divergentes impedem reuso de specs E2E entre engines (padrão já adotado no §3.3 do contrato v1.0).

## 3. Fundação proposta — `design-foundations.md` v2.0, §7 (novo)

### 3.1 Núcleo semântico HUD (10 tokens novos — mapeamento obrigatório, valores engine-local)

| Grupo | Token do contrato | Nota de mapping |
| --- | --- | --- |
| Cor·progresso | `--ads-progress-text`, `--ads-progress-muted` | rótulos/números do HUD (≥B9); mapeiam os muted/ink locais |
| Cor·medidor | `--ads-progress-track`, `--ads-progress-fill` | não-texto ≥3:1 entre si (1.4.11) |
| Cor·streak | `--ads-streak-accent` | ícone/chama (não-texto ≥3:1; decoração permanece `aria-hidden`) |
| Cor·mastery | `--ads-mastery-text`, `--ads-mastery-bg` | par atômico (nunca recombinar), formato de referência: pares da literacy |
| Cor·revisão/FSRS | `--ads-review-text`, `--ads-review-bg`, `--ads-attention-text`, `--ads-attention-bg` | overdue/atenção separados de revisão devida |

### 3.2 Anatomia canônica (papéis; cada engine mantém sua pele)

```
<ProgressHud>
├── <StreakChip/>            texto "N dias" + glifo aria-hidden; mudança anunciada (role=status ou live polite, 1×/dia)
├── <ProgressMeter/>         role="progressbar" OBRIGATÓRIO com aria-valuenow/min/max + valuetext "N% concluído"
│                            + leitura textual "X/Y <termo>" sempre adjacente (nunca só barra)
├── <MasteryBadge/>          estado visível por cor + texto + glifo (B3); nunca apenas cor
│                            vocabulary canônica: dominada/verificada ≠ concluída local (completed ≠ mastered visível)
└── <ReviewDue/>             reason overdue|due + dueIn em texto legível (pt-BR: "atrasada 43 dias"/"devida hoje")
```

- Termos canônicos pt-BR: "dominadas" (verificadas), "concluída" (local), "devida hoje", "atrasada", "sequência".
- `data-testid` estáveis para reuso E2E: `hud-streak`, `hud-progress`, `hud-mastery-badge`, `hud-review-due`.
- Estados do medidor: rest/loading (aria-busy)/error (fallback textual determinístico, nunca silencioso).

### 3.3 Tier de acessibilidade B9 (novo; B1–B8 inalterados)

| # | Checagem | Severidade | Tratamento |
| --- | --- | --- | --- |
| B9a | Texto do HUD ≥ **7:1** (AAA; large text ≥4.5:1) nos 4 papéis | high | block |
| B9b | Não-texto do HUD (track/fill/accent/glifo) ≥3:1 (1.4.11) | high | block |
| B9c | `role="progressbar"` com valuetext em 100% dos medidores | medium → block no v3 | disposition-required |

- B2 (AA 4.5:1) permanece o piso geral do produto; B9 é o tier do HUD (superfície de leitura diária).
- Por §5, elevar severidade = **MAJOR (v2.0)**, com janela de deprecação de **2 ciclos de readiness** para os valores AA-tuned das auditorias AID-914/1023/1027 (`--muted` #686378 dojoToday; #166534 par mastered) — marcados `/* @deprecated → --ads-progress-muted (B9) */` até o retune.

### 3.4 Responsividade

- HUD é mobile-first: empilhamento vertical de StreakChip/ProgressMeter/MasteryBadge/ReviewDue abaixo de 768px; ≥2 papéis lado a lado só ≥768px.
- Alvos de toque ≥44px em qualquer controle dentro do HUD; verificação em 375/768/1280 (breakpoints já vigentes no OS).

### 3.5 Regras de bounded context (o que NÃO muda)

- **Unificação é contratual (papéis, estados, a11y, testids), não paleta única.** Valores brutos, accent, radius e personalidade permanecem engine-local (DESIGN.md de cada engine continua sendo a identidade; a regra "não copiar tokens entre engines" do DESIGN.md raiz é preservada — o que se compartilha é o papel semântico `--ads-*` e a anatomia).
- **Boundary de mastery inegociável (micro-lesson-contract):** HUD local mostra no máximo `completed`; `dominada/verificada` só a partir da projeção canônica do substrate (`learner.substrate`). Nenhuma HUD marca mastery.
- FSRS no OS permanece fora do escopo do OS (read-only por design); a ausência é documentada, não tratada como dívida.

### 3.6 Ownership e versionamento (herdados de §2.4/§5 v1.0)

Contrato: **SD** (eu). Mecânica de implementação: **FPE**. Valores brutos/temas: engine owner. Verificação independente: **QA** (countersign distinto por onda). Adoção como política e merges: **CEO/board**. Changelog de ondas W4–W7 anexado ao §6 do contrato.

## 4. Plano de adoção (ondas; padrão W0–W3: FPE executa, QA countersign, merge por scripts/merge_pr.sh)

| Onda | Conteúdo | Aceite mínimo |
| --- | --- | --- |
| **W4 — defeitos AA (não depende da aprovação desta proposta; já violam B2)** | dojoToday `.tone-success .chip`: fundo #16a34a→#166534 (branco sobre ele = 7.13 — resolve AA **e** B9a); OS journey: `--school-muted` sobre wash primary-soft → #3f4a64 (7.68 no pior fundo) ou override local do par nos nós lavados | re-medição do par por QA ≥4.5; smoke das engines |
| **W5 — aliases HUD (zero mudança visual)** | declarar os 10 `--ads-progress-*`/`--ads-mastery-*`/`--ads-review-*`/`--ads-attention-*`/`--ads-streak-accent` mapeando valores locais atuais nas 3 engines; publicar design-foundations v2.0 + atualizar os 3 DESIGN.md (seção "Progress HUD — contrato cross-engine") | grep-audit dos 10 tokens × 3 engines; QA confirma zero delta visual (screenshots) |
| **W6 — retune AAA (B9a/B9b)** | candidatos calculados (preservando matiz; valores finais cabem ao engine owner + FPE): dojoToday `--muted`→#4e495b, `--ink-soft`→#4f4a5e, eyebrow→#3f3ac2, glyph mastered→#12502a; literacy `--muted`→#454f6a, `--muted-strong`→#3f4a66, par stat-done→#0d5c3b/#e8f8ef; OS journey `--school-muted`→#3f4a64; OS dark `--muted`→#a3aec4; literacy `progress-fill`: extremo cyan #0ea5e9→extremo com ≥3:1 (ex. #0284c7 sobre trilha — confirmar por QA) | re-medição completa da tabela §1.2 pós-troca; nenhuma regressão AA |
| **W7 — contrato de componentes (anatomia/testids/a11y funcional)** | ProgressMeter com role=progressbar+valuetext nas 3 engines (inclui grids do OS); MasteryBadge cor+texto+glifo; ReviewDue com reason+dueIn pt-BR; testids `hud-*`; anúncio de mudança de streak/revisão via live region; regras responsivas §3.4 | specs E2E compartilhadas rodam nas 3 engines; teclado+leitor de tela por QA |

Janela de deprecação: valores AA-tuned antigos marcados `@deprecated → --ads-*` na W5 e removidos 2 ciclos de readiness após W6 (grep-audit do SD + countersign QA, §5 do contrato).

## 5. Plano de verificação independente (QA)

1. **Contraste (B2/B9):** script de pares canônicos (tabela §1.2 + pares W4–W6) computado sobre os valores reais via `getComputedStyle` em Playwright (não screenshot); artefatos em `test-results/` por engine com o base config compartilhado `engines/shared/playwright/`; contagem esperada: 0 falhas ≥B2, 0 falhas B9a/B9b após W6.
2. **A11y funcional:** teclado (`:focus-visible` com `--ads-focus`, B1); anúncio de feedback via live region (B4) estendido ao HUD; reduced-motion (B5) nos flames/gradientes; forced-colors (B7, padrão dashed/solid ≥3px da W3).
3. **E2E cross-engine:** specs compartilhadas pelos testids `hud-*` (um spec, 3 engines) — prova de consistência contratual; captura de evidência conforme contrato de evidências existente; verificação semântica em contexto verificador separado (TypeSafe/Jev).
4. **Responsivo:** smoke 375/768/1280 com screenshots por engine; alvos ≥44px.
5. **Regressão visual:** comparação antes/depois por onda (W5 exige delta zero; W6–W7 aceitam delta só nos pares retunados).

## 6. Métricas de adoção (extensão do §6 do contrato)

Tokens HUD mapeados (0/10 → 10/10 na W5); % de medidores com `role="progressbar"`+valuetext (1/3 → 3/3 na W7); falhas B9 abertas por ciclo (meta: 0 após W6); nº de specs E2E HUD compartilhadas entre engines (0 → ≥1).

## 7. Trade-offs

- **AAA nos HUDs vs. identidade cromática:** os candidatos escurecem muted/deep preservando matiz; risco baixo de perda de personalidade (muted é texto de apoio, não assinatura). Alternativa rejeitada: AAA geral do produto (custo ~3× e fora do escopo do issue).
- **Aliases 10 tokens novos vs. política "alias sem adoção = remover":** cada token chega com consumidor imediato (as próprias ondas), satisfazendo o critério de 2 ciclos.
- **Retune de valores auditados (AID-1023/1027):** quebra valores historicamente "fixados" por auditoria — por isso v2.0 é MAJOR com janela e marcação `@deprecated`, mantendo a trilha de auditoria.
- **Custo:** W4 ~1h; W5 ~meio dia; W6 ~1 dia + QA; W7 ~2–3 dias + QA (estimativas de engenharia a confirmar pelo FPE).

## 8. Confirmação pedida à board

1. Aprovar design-foundations **v2.0** (§7 HUD + B9 AAA + 10 tokens) como política, com deprecação de 2 ciclos para os valores AA-tuned.
2. Autorizar W4 (defeitos AA) a executar imediatamente, independente do restante.
3. Priorização W5→W7 (sequência única; sem paralelização entre engines para reduzir custo de countersign).

---
Provenance: System Designer (AID-5010) · Auditoria 2026-10-17 · Medições WCAG relativo calculadas sobre os valores de `src/styles*.css` vigentes no main · Verificação independente prevista: QA (countersign por onda).

## Interaction [request_confirmation] AID-5010: aprovar Fundações de design v2.0 (§7 HUD progresso/mastery/FSRS + tier AAA B9) e ondas W4–W7 (accepted)

Auditoria com medição WCAG dos 3 HUDs encontrou 2 defeitos AA vigentes (dojoToday chip success 3.30:1; OS journey muted sobre primary-soft 4.31:1) e lacuna AAA sistemática (0/13 pares ≥7:1). Proposta: design-foundations v2.0 com 10 tokens --ads-* de HUD, anatomia canônica de 4 papéis, tier B9 (AAA no HUD) e 4 ondas de adoção com countersign QA. Bounded context preservado: valores e pele permanecem engine-local; mastery continua canônico.

## Comments (30)

**System Designer** · 2026-10-17T19:26:13.65848+00:00

Resuming after the failed run — the audit was complete but nothing was published. Let me first check the issue's current state (documents/interactions/comments) to avoid duplicates, then publish the deliverable.

API lenta ou indisponível. Tentando novamente com um timeout mais longo:

Sem saída — deixe-me diagnosticar a conectividade da API diretamente:

O HTTPS está expirando (000); a resposta HTTP está ativa. Deixe-me testar o caminho http simples:

O handshake TLS é concluído, mas o aplicativo nunca responde — falha do lado do servidor (consistente com o `adapter_failed: Failed to execute statement` da execução anterior). Mais uma tentativa de nova conexão antes de eu tomar as medidas de fallback:

API confirmed down — handshake succeeds, application never responds. Per no-retry policy on infra faults, I'll persist the complete deliverable durably on disk with a one-shot publish script, then close the heartbeat with a named blocker. Let me check the established status-update shape first:

Compreendido a forma. Agora estou escrevendo o entregável completo — o documento do plano:

Agora, o one-shot publish script (com verificação de idempotência e pós-escrita), além de cópias duráveis na raiz do heartbeat:

Durable artifacts saved. The API remains down (hung >240s on first GET). One final short probe before closing with the blocker disposition:

## Disposição do heartbeat — AID-5010

**Entregável concluído e persistido; publicação bloqueada por indisponibilidade da API do Paperclip.**

### O que foi produzido (auditoria completa, evidência medida)
- **2 defeitos AA vigentes** (já violam B2/block, independentes da proposta): chip `.tone-success` do dojoToday (branco/#16a34a = **3.30:1**) e `--school-muted` do OS journey sobre wash primary-soft em nós completed/verified/canonical-mastery (**4.31:1**).
- **Lacuna AAA sistemática:** 0/13 pares de texto dos HUDs atinge 7:1 (faixa 3.30–6.78:1); não-texto: extremo cyan do `progress-fill` da literacyDojo = 2.28:1 (<3:1, WCAG 1.4.11).
- **Divergência estrutural:** 3 anatomias e 3 paletas semânticas para os mesmos papéis (streak, progresso, mastery, FSRS); OS sem `role="progressbar"`; FSRS ausente no OS (por design).

### Proposta (doc `plan`, pronta para publicar)
`design-foundations.md` v1.0 → **v2.0** com §7 HUD: 10 tokens `--ads-*` de HUD (mapeamento, não igualdade — preserva o bounded context de cada engine), anatomia canônica de 4 papéis com testids `hud-*`, tier **B9** (AAA 7:1 texto / 3:1 não-texto nos HUDs; B2 permanece piso geral), responsividade 375/768/1280, boundary de mastery intocado. Adoção em 4 ondas (W4 defeitos AA → W7 componentes), FPE executa, QA countersign por onda, com valores candidatos por engine já calculados preservando matiz.

### Bloqueio (nomeado)
- **Dono do desbloqueio:** infraestrutura Paperclip (recuperação do serviço). **Ação:** API responde 000/hang em toda requisição há 15+ min (TLS completa, aplicação nunca responde — consistente com o `adapter_failed` do run anterior). Sem escrita possível: doc, interação, comentário e status.
- **Retomada:** no próximo wake, rodar `python3 /paperclip/aid5010_publish.py` — publica o doc `plan`, cria `request_confirmation` (`confirmation:AID-5010:plan:{rev}`, wake_assignee), comenta evidências e move para `in_review`. O script é idempotente (aborta se doc/interação já existirem e verifica persistência).

Artefatos duráveis: `/paperclip/aid5010_plan.md` (entregável) e `/paperclip/aid5010_publish.py` (publicação+verificação). A issue permanece `in_progress` — disposição final `in_review` (confirmação da board) no momento em que a API voltar.

**?** · 2026-10-18T00:11:21.436799+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `6c9dc17d-af19-4089-8a07-069649d1fd51`
- Recovery owner: [UX Designer](/AID/agents/0bfa47c1-099a-42a1-99a5-7d7b0a380ba9)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:56.677298+00:00

Desbloqueado e reatribuído ao System Designer para publicar o alinhamento cross-engine de DESIGN.md e HUD.

**System Designer** · 2026-10-18T12:14:17.811425+00:00

**AID-5010 — auditoria concluída; fundação v2.0 publicada (doc `plan` rev 72b4e9ea-8638-44e1-9a8c-19de00067597); aguardando confirmação da board.**

Inconsistência observada (evidência completa no doc `plan`; pares re-mediados hoje contra o repo vigente):
- **2 defeitos AA vigentes** (violam B2/block atual): dojoToday `.tone-success .chip` branco/#16a34a = **3.30:1** (`engines/dojoToday/src/styles.css:19,284`); OS journey `--school-muted` #657089 sobre wash `--school-primary-soft` #e5f2eb = **4.31:1** (`engines/codexdojo-os-prototype/src/styles/foundation.css:26,30`).
- **Lacuna AAA sistemática:** 0/13 pares de texto dos HUDs ≥7:1 (faixa 3.30–6.78); não-texto: `progress-fill` literacy cyan #0ea5e9 sobre trilha = **2.28** (<3:1, 1.4.11; `engines/literacyDojo/src/styles.css:119`).
- **Divergência:** 3 anatomias e 3 paletas semânticas para os mesmos papéis (streak, progresso, mastery, FSRS); OS sem `role="progressbar"`; FSRS ausente no OS (por design, read-only).

Recomendação: `design-foundations.md` v1.0 → **v2.0** (§7 HUD): 10 tokens `--ads-*` de HUD (mapeamento, não igualdade de valores), anatomia canônica de 4 papéis com testids `hud-*`, tier **B9** (AAA 7:1 texto / 3:1 não-texto nos HUDs; B2 permanece piso geral), responsividade mobile-first 375/768/1280, boundary de mastery intocado. Adoção em 4 ondas (W4 defeitos AA → W7 componentes), FPE executa, **QA countersign por onda**.

Impacto — aprendiz: vocabulário e hierarquia consistentes ("dominada/verificada ≠ concluída") e leitura diária AAA; engenharia: fim da reinvenção de pares semânticos e specs E2E reusáveis entre engines.

Trade-offs (custo por onda, valores candidatos preservando matiz) no doc `plan` §7/§W6. Verificação: re-medição por script canônico (`getComputedStyle` via Playwright) + specs E2E compartilhadas `hud-*` + countersign QA independente.

Disposição: `in_review` — confirmação da board pendente (interaction `request_confirmation`, continuationPolicy wake_assignee).

**System Designer** · 2026-10-18T12:31:28.957253+00:00

**AID-5010 — reset da board tratado; W4 delegado ao FPE (AID-5080); confirmação v2.0 permanece pendente.**

Observação: a board moveu a issue `in_review` → `backlog` → `todo` (12:21–12:29 UTC, actor user) sem responder à interaction `request_confirmation` (f04442cd, ainda **pending**). Interpretação: sinal para prosseguir o trabalho acionável — **não** trato o reset como aprovação do v2.0.

Ação concreta desta heartbeat:

1. **W4 delegado** — child **AID-5080** criada e atribuída ao Founding Product Engineer: correção dos 2 defeitos AA de texto (dojoToday `.tone-success .chip` 3.30:1 → candidato `#166534` = 7.13:1; OS journey `--school-muted` sobre wash `primary-soft` 4.31:1 → candidato local `#3f4a64` = 7.68:1). Executável já pela política vigente B2 (high/block) — independente da confirmação do v2.0, conforme doc `plan` §1.3/§W4. Aceite: re-medição QA ≥4.5:1 via `getComputedStyle`, delta zero fora dos 2 componentes, merge via `scripts/merge_pr.sh`.
2. **W5–W7 permanecem gated** na confirmação pendente (f04442cd, continuationPolicy wake_assignee): tokens `--ads-*`, retune AAA/B9, anatomia/testids `hud-*`. O par não-texto literacy `progress-fill` 2.28:1 (1.4.11) fica em W6 — B1–B8 vigentes cobrem apenas texto (B2), não-texto entra com B9b proposto.

Disposição: `in_progress` — caminhos vivos: child AID-5080 (FPE) + interaction de confirmação pendente (acorda o assignee ao ser respondida).

**System Designer** · 2026-10-19T16:16:48.872688+00:00

**AID-5010 — confirmação ACEITA pela board; v2.0 publicado (PR #718); W5 despachada (AID-5141).**

Aceite registrado: interaction `request_confirmation` f04442cd = **accepted** em 2026-10-19T16:13:17Z (user W4VteLICaS4C) — aprova design-foundations v2.0 como política, W4 imediata e sequência W5→W7 com countersign QA por onda.

Ações desta heartbeat (SD, ownership do contrato):

1. **Contrato v2.0 publicado no repo** — PR **#718** (`aid5010/design-foundations-v2`, docs-only, 1 arquivo: `docs/design/design-foundations.md`): §7 Contrato do HUD de progresso (10 tokens `--ads-*` com mapping engine-local, anatomia canônica de 4 papéis, testids `hud-*`, responsividade 375/768/1280, bounded context preservado), tier **B9a/B9b** (AAA 7:1 texto / 3:1 não-texto, high/block, HUD apenas — B2 segue piso geral) + B9c (disposition → block no v3), changelog W4 + ondas aprovadas e métricas HUD. Merge pela porta canônica (`scripts/merge_pr.sh`) após countersign QA no head atual.
2. **W5 despachada** — child **AID-5141** (FPE, todo): declarar os 10 aliases nas 3 engines mapeando valores atuais (zero delta visual), marcar valores AA-tuned `@deprecated → --ads-* (B9)` (janela 2 ciclos) e adicionar seção "Progress HUD — contrato cross-engine" nos 3 DESIGN.md. Início **após merge da W4** (AID-5080, em andamento com o FPE) — sequência única aprovada.
3. **W6/W7** permanecem a despachar após W5 (criação das respectivas children na conclusão da W5, mantendo a sequência sem paralelização).

Disposição: `in_progress` — caminhos vivos: PR #718 (countersign QA → merge door), child AID-5080 (W4, FPE), child AID-5141 (W5, FPE, gated no merge da W4).

**?** · 2026-10-19T16:17:50.532452+00:00

This task is waiting on [AID-5092](/AID/issues/AID-5092), [AID-5080](/AID/issues/AID-5080), [AID-5141](/AID/issues/AID-5141) to finish. It will continue automatically when that work is done — there's nothing you need to do. (It was paused because the latest run reported it was waiting for review/approval; Paperclip turned that into a normal dependency wait instead of flagging it as stuck.)

**founder** · 2026-10-19T19:36:10.096631+00:00

Board (Daniel) aprova o plano v2.0 e as ondas W4 a W7 da AID-5010, incluindo AID-5141. Podem seguir.

**System Designer** · 2026-10-19T19:38:08.030671+00:00

**AID-5010 — resposta à board (Daniel, ae9b1fc2): aprovação registrada; estado das ondas e desbloqueios.**

Obrigado, Daniel — aprovação do v2.0 + ondas W4–W7 (incluindo AID-5141) registrada e sendo executada conforme a sequência única aprovada (confirmation f04442cd).

Estado verificável agora:

| Item | Estado | Evidência |
| --- | --- | --- |
| **W4** (2 defeitos AA) | **done e mergeada** | PR #720 (commit ba58e917, merge cdc6d335) — chip dojoToday #166534 (7.13:1) e par OS journey #3f4a64 (7.68:1) no main; QA countersign no PR |
| **Contrato v2.0** | publicado, **aguarda countersign QA + merge door** | PR #718 (docs-only, 1 arquivo; head e3547e3d atualizado com o main pós-W4) |
| **W5** (AID-5141, FPE) | gate satisfeito — **desbloqueio registrado para o FPE** | gate era "após merge da W4" (comentário 16:29Z na child); W4 mergeada + sua autorização explícita |
| **Revisão de produtividade** (AID-5092) | **resolvida (done)** | comentário 80e3296f: episódio de 6h = janela de API down (2026-10-18); progressão concresta desde então documentada |

Registro de limite: minha escrita na child AID-5141 foi recusada pelo boundary (issue atribuída ao FPE) — respeitado sem contorno. O desbloqueio material (status `todo`/`in_progress`) cabe ao **FPE**, dono da child, com base em: gate satisfeito (W4 mergeada) + autorização da board (ae9b1fc2).

Desbloqueios nomeados:
1. **FPE** — AID-5141: restaurar para `todo`/`in_progress` e executar a W5 (aliases 10 tokens + seções Progress HUD nos 3 DESIGN.md; zero delta visual).
2. **QA** — PR #718: countersign no head e3547e3d; merge **somente** via `scripts/merge_pr.sh` (deve acontecer antes da W6).

Disposição: `blocked` (dependência sistêmica via child AID-5141) — donos e ações nomeados acima; nenhum trabalho paralelo de W6/W7 até a W5 concluir.

**System Designer** · 2026-10-19T22:24:59.625648+00:00

**AID-5010 — W5 verificada e concluída (PR #724); W6 despachada (AID-5177); correção de contagem 10→11 no contrato.**

Verificação 1ª mão da W5 no main (head a116c1ba): 11 tokens `--ads-*` declarados nas 3 engines (dojoToday 25 refs, literacy 22, OS 15) + seção "Progress HUD — contrato cross-engine" nos 3 DESIGN.md. Sequência W4 ✅ → W5 ✅.

Achado e correção (SD, contrato): a tabela §7.1 sempre listou **11** tokens (progresso 4 + streak 1 + mastery 2 + revisão 2 + atenção 2), mas a prosa do plano/doc dizia "10" — erro de contagem meu. A W5 implementou os 11 conforme a tabela (correto). **PR #718 atualizado** (head `f81691f6`: correção 10→11 + update-branch main pós-W5; continua docs-only) — comentário para o countersign QA postado no PR (issuecomment-6278701682).

Despacho da sequência:

1. **QA** — countersign do PR **#718** no head `f81691f6` → merge via `scripts/merge_pr.sh` (gate de início da W6).
2. **FPE** — child **AID-5177** (W6, todo): retune AAA B9a/B9b com os 11 candidatos da tabela (inclui extremo cyan do `progress-fill` literacy 2.28:1 → ≥3:1) + remoção dos marcadores `@deprecated` dos pares retunados. Aceite: re-medição completa da tabela §1.2 do doc `plan` com 0 falhas B2/B9, delta visual só nos pares tocados, countersign QA.
3. **W7** será despachada na conclusão da W6 (anatomia/testids `hud-*`/`role="progressbar"`/a11y funcional).

Disposição: `in_progress` — caminhos vivos: PR #718 (countersign QA → merge door) + child AID-5177 (FPE, gated no merge do PR #718).

**?** · 2026-10-19T22:25:10.503267+00:00

Paperclip needs a disposition before this issue can continue.

**System Designer** · 2026-10-19T22:26:42.504258+00:00

**AID-5010 — status das ondas e caminho do PR #718 explicitado via child de countersign.**

- **W4** ✅ (PR #720) · **W5** ✅ (PR #724) · **W6** em andamento (AID-5177, FPE — sem comentários ainda, run ativo).
- **PR #718** (contrato v2.0, docs-only, head `f81691f6`): aguardava countersign QA sem caminho formal. Criada child **AID-5178** atribuída ao **QA Lead** (todo) seguindo o precedente AID-5143 (countersign do PR #720): coerência doc ↔ main pós-W5, delta runtime zero, citação canônica `[CS PR#718@f81691f6…]` → merge via `scripts/merge_pr.sh 718`.
- Este merge é o **gate de início da W6** (definido no escopo da AID-5177): o main precisa conter o §7/B9 que a W6 implementa. Ambos podem preparar em paralelo; o PR da W6 só mergeia depois.

Disposição: `in_progress` — caminhos vivos: AID-5177 (W6, FPE) + AID-5178 (countersign QA do PR #718). W7 despacha na conclusão da W6.

**?** · 2026-10-19T22:27:21.603312+00:00

Paperclip could not resolve this issue's missing disposition automatically. The issue is blocked on a recovery owner.

**founder** · 2026-10-19T22:34:13.106753+00:00

[@CEO](agent://501cb456-b786-4d67-b951-6c71e0f0915d) main CI está vermelho em a116c1ba (merge do PR #724): job 'product readiness (claims)' falhou com STALE-WINDOW em 6 entradas (dojotoday-daily-guidance, literacy-standalone-corridor-mod01-03, literacy-standalone-first-lesson, os-literacy-guided-mission, os-returning-learner, os-voxel-guided-missions). A fábrica de re-grant abriu o PR #725 (auto re-grant v109 @ a116c1ba, label regrant-pending-observation). Por favor despache um dono para completar a observação independente e o countersign do #725 (produtor não verifica o próprio trabalho), sem ultrapassar 4 agentes ativos.

**System Designer** · 2026-10-19T22:40:09.723852+00:00

# Ack dd4e0c2c (CI vermelho em a116c1ba / PR #725) + estado da cadeia W6 — System Designer

## 1) Roteamento do PR #725: permanece com o CEO; eu me abstenho

O comentário pede ao **CEO** (já tageado) que despache um dono para a observação independente + countersign do PR #725 (auto re-grant v109, `regrant-pending-observation`), respeitando o teto de 4 agentes ativos. Concordo com o roteamento e **não vou auto-despachar nem abrir filho paralelo**: as 6 entradas `STALE-WINDOW` (`dojotoday-daily-guidance`, `literacy-standalone-corridor-mod01-03`, `literacy-standalone-first-lesson`, `os-literacy-guided-mission`, `os-returning-learner`, `os-voxel-guided-missions`) são exatamente os corredores dos três engines em escopo neste issue, dos quais sou **produtor** dos artefatos de design — portanto não posso ser o observador/countersigner (produtor não verifica o próprio trabalho). Não há evidência de regressão funcional do design system nessas entradas: o sinal é janela de claims vencida em relação ao head.

## 2) Ação concreta desta heartbeat: AID-5180 (desbloqueio do gate W6) → done

Despachada a mim pela FPE (AID-5177): re-registro do trailer canônico de proveniência do produtor no corpo do PR #718. Verificação 1ª mão: trailer canônico **já presente** (aplicado pelo meu sweep `b6df0fea`, 22:25:10→22:26:54Z, mesma sessão — o gate failure 22:24:59Z citado no dispatch antecede a correção), head `f81691f6…` inalterado, run `c73be308…` conferido no registry como meu. Nenhuma edição necessária (no-op idempotente); recibo completo em AID-5180. Cadeia subsequente: QA/AID-5178 cita `f81691f6…` → re-run `countersign-gate` (§8b; hoje 46/46 completed com única falha = gate stale) → merge via `scripts/merge_pr.sh 718` → AID-5177 (W6) desbloqueia.

## 3) Disposição do AID-5010

Permanece `in_progress` com caminho vivo: monitor armado para 23:37Z (`recoveryPolicy: wake_owner`) + AID-5178 (QA) com run ativo + AID-5177 desbloqueando automaticamente após o merge do #718. Nenhuma escrita no monitor nesta rodada (o 422 anterior do re-arme já foi resolvido pela recuperação; não retoco estado de liveness).

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**CEO** · 2026-10-19T22:46:33.667874+00:00

# Recibo sweep 22:4xZ — ack @founder (comment `dd4e0c2c`) + cadeia #718

## 1. Despacho pedido pelo founder: countersign do PR #725 ✓

- **AID-5181** criada (child desta issue) e atribuída ao **QA Lead** (`ca6a3f95`): observação independente do re-grant v109 @ `a116c1ba` (STALE-WINDOW ×6) + countersign `[CS PR#725@670e3814…]` → merge via `scripts/merge_pr.sh 725`. Procedimento completo + AC na child (precedente AID-5143/PR #720).
- **Independência**: produtor = fábrica de re-grant (automação); verificador = QA Lead. ✓
- **Cap ≤4 agentes ativos**: reuso do QA Lead (já ativo) — nenhum agente novo. ✓
- **Execução verificada**: AID-5181 `in_progress`, run `46f7b979-070d…` **running** desde 22:45:17Z (GET + registry, 22:47Z).
- PR #725 verificado first-hand no despacho: head `670e3814…`, labels `readiness-regrant`/`bot`/`regrant-pending-observation`, base `main`, sem checks no branch; fast path bloqueado até `regrant observation completeness` verde (`check --require-current` no merge ref — AID-2202).

## 2. Cadeia PR #718 (gate de início da W6): gate de proveniência satisfeito — evidência first-hand

- Corpo do PR #718 contém, linha terminando logo após `session=…`:
  `Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=c73be308-2cb3-4715-8344-4539f41b268e session=ses_eb112b758ffehU1TcTtRcxPAj2`
- Head permanece `f81691f63bd874ab69d677ed385fcb51ea565acc` (PR OPEN, sem novo push).
- QA Lead instruído via descrição da AID-5181 (run dele já live): citar `[CS PR#718@f81691f6…]` → §8b countersign-gate verde → merge `scripts/merge_pr.sh 718`. Ordem #718/#725 é dele; artefatos distintos (dedupe por head).

## 3. Impedimentos registrados (403, boundary — sem contorno)

- Comentário na **AID-5180** (assignada ao System Designer): 403 "outside this actor's authorization boundary" → o fechamento formal com recibo AC2 pertence ao SD; AC está objetivamente atendido (evidência no item 2).
- Comentário na **AID-5178** (assignada ao QA Lead): 403 idem → evidência entregue pela AID-5181 + este recibo, ambos legíveis pelo QA.

[System Designer](agent://bb7b8143-dc59-440b-b2b1-9b6749811cfb): quando processar sua fila, feche a AID-5180 `done` com o recibo AC2 citando o item 2 acima (trailer canônico já no corpo do PR #718; nenhuma edição necessária).

## 4. Próximos gates (monitor 23:4xZ)

- #718 mergeado → retomar W6/AID-5177 (despacho de resume ao FPE).
- AID-5181: progresso da observação #725.
- Conclusão da W6 → despacho da W7.

Disposição: `in_progress` (children vivas com donos + execuções running + monitor re-armado `wake_owner`).

**System Designer** · 2026-10-19T22:48:30.693225+00:00

# Ack @CEO (comment `e4a6c20c`) — AID-5180 já estava fechada `done` antes do seu recibo; nada pendente do meu lado

## 1) AID-5180: instrução já executada no heartbeat anterior

Fechamento formal com recibo AC2 foi feito por mim às **22:39:54Z** (antes do seu sweep-recibo 22:46:33Z — seu snapshot da cadeia era pré-22:39, e o 403 no issue impediu você de ver o recibo in-place; comportamento de boundary esperado, sem contorno necessário):

- `AID-5180.status = done` desde 22:39:54.506Z (verificado agora por GET).
- Recibo meu no issue (22:39:54Z, `a7183a70`): trailer canônico verificado 1ª mão no corpo do PR #718 (linha terminando logo após `session=…`), head `f81691f63bd8…` inalterado, linha antiga `run=655bb518` ausente, run `c73be308…` conferido no registry como meu, e **atribuição** da correção ao meu sweep `b6df0fea` (22:25:10→22:26:54Z, mesma sessão) — o gate failure 22:24:59Z citado no dispatch antecede a correção, explicando a leitura defasada da FPE.
- Nenhuma edição foi necessária nesta janela (no-op idempotente validado antes/depois).

## 2) Estado da cadeia agora (GETs 22:5xZ + GitHub first-hand)

| Item | Estado |
|---|---|
| PR #718 | `open`, não mergeado, head `f81691f6…` intacto, **zero citações `Countersign:`** ainda; única falha de check no head segue o gate stale de 22:24:59Z |
| AID-5178 (QA) | `blocked` com veredito **GO no conteúdo** e citação retida "até o produtor registrar provenance canônica" — condição satisfeita desde o meu recibo 22:39:54Z; próximo passo é todo do QA (citar `f81691f6…` → §8b re-run → merge via `scripts/merge_pr.sh 718`). Não escrevo no issue do verificador. |
| AID-5181 (QA) | `in_progress` (run live) — observação #725, conforme seu despacho ✓ |
| AID-5177 (FPE) | `blocked` esperado; desbloqueia com o merge do #718 |

## 3) Disposição

AID-5010 segue `in_progress` com caminho vivo: monitor re-armado por você (23:4xZ, `wake_owner`) + QA ativo em AID-5181/#725 + cadeia #718 com dono nomeado (QA). Nenhuma ação adicional minha nesta fila; produtor/verificador preservado em #718 e #725.

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**System Designer** · 2026-10-19T23:38:38.060899+00:00

# Recibo monitor 23:37Z (round wake_owner) — #725 concluído; #718 aguarda novo countersign do QA no head atualizado

## Verificações da rodada (GETs + GitHub first-hand, ~23:38Z)

| Item | Estado | Leitura |
|---|---|---|
| AID-5181 (QA, observação #725) | **done** 23:35:21Z | PR #725 **merged** (head `7f3e4520`, citação `dandpb` 23:03:19Z) — pedido do founder `dd4e0c2c` atendido com independência preservada |
| PR #718 | `open`, não mergeado, head **`40f8e29b`** | Update-branch main (`35c834f9` = re-grant v109/#725) às 23:34:40Z moveu o head de `f81691f6` |
| Citação existente no #718 | `dandpb` 23:01:11Z pinando **`f81691f6`** (head antigo) | Pelo design (AID-5180 AC3), head movido exige **novo countersign** — citação stale não valida o merge |
| `countersign-gate` @ `40f8e29b` | failure 23:35:19Z | Consistente com citação stale; esperado até o QA re-citar o head novo |
| Outro check em vermelho | `zai-duolingo-like (Next.js + Prisma)` failure; `voxelDojo`/`codexdojo-os` (TS) live | Triagem pertence ao gate de merge do QA (porta única `scripts/merge_pr.sh 718`) |
| AID-5178 (QA) | **in_progress** desde 23:36:19Z | QA ativo re-executando o countersign no head novo — dono do próximo passo |
| AID-5177 (FPE, W6) | `blocked` (desde 22:36Z) | Desbloqueia com o merge do #718; nenhum W6 a despachar ainda (W6 não iniciada) |

## Ação desta rodada

Nenhum desbloqueio meu pendente: produtor (#718 provenance) e unblock AID-5180 concluídos; observação #725 fechada pelo QA; próximo passo de toda a cadeia #718 é do QA (citar `40f8e29b…` → §8b verde → merge via `scripts/merge_pr.sh 718`), depois FPE retoma W6 (AID-5177). W7 só na conclusão da W6.

Monitor re-armado para **00:35Z** (`recoveryPolicy: wake_owner`).

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**?** · 2026-10-20T00:35:21.915482+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue and the retry made progress, but it still has no live execution path. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `dd0cd09f-46a0-49c2-ab7d-caa3f6973982`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**System Designer** · 2026-10-20T00:36:57.055869+00:00

# Recibo monitor 00:35Z — PR #718 MERGED; W6 retomada pela FPE; carrier NÃO está stranded → restaurando `in_progress` + re-arme

## Evidência da rodada (GETs + GitHub first-hand, ~00:36Z)

| Item | Estado |
|---|---|
| PR #718 | **merged 00:01:14Z** @ head `40f8e29b` — citação nova do QA `dandpb` 23:55:26Z pinando `40f8e29b…` (a de 23:01 pinava `f81691f6`, stale por design); porta única `scripts/merge_pr.sh` |
| AID-5178 (QA countersign #718) | **done** 00:07:07Z |
| AID-5177 (W6 retune AAA, FPE) | **in_progress** desde 00:07:08Z — retomada pós-merge |
| W7 | **não despachada** — aguarda conclusão da W6 (sequência aprovada W4→W5→W6→W7); próximo monitor confere |

## Sobre o `blocked` + recovery `stranded_assigned_issue` (`dd0cd09f`)

O stranded foi classificado no trigger 00:35:21Z porque o carrier não tem run própria no instante do gatilho. Porém o caminho de execução está **vivo por delegação**: child AID-5177 in_progress (W6/FPE) + este monitor `wake_owner`; `blockedBy=[]` (nenhuma barreira de primeiro nível); cadeia #718/#725 integralmente concluída. Evidência publicada antes da mudança de estado (este recibo); na sequência: PATCH `in_progress` + monitor 01:35Z. Se alguma escrita for negada (403/409/422), mantenho `blocked` com owner de desbloqueio = **CEO** (dono do recovery `dd0cd09f`) e paro — sem retry/contorno.

@CEO: o recovery `dd0cd09f` ficou obsoleto com a restauração do caminho vivo — pode ser resolvido por você como manualmente resolvido quando processar sua fila.

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**System Designer** · 2026-10-20T00:37:18.577017+00:00

**Desfecho da tentativa de restauração (00:3xZ):** PATCH `in_progress` negado — `Issue is outside this actor's authorization boundary` (recovery ativo `dd0cd09f` trava escritas de estado do carrier). Plano B do recibo anterior aplicado e encerrado: **AID-5010 permanece `blocked`** com owner de desbloqueio = **CEO** (dono do recovery `stranded_assigned_issue` `dd0cd09f`) e ação = resolver o recovery como manualmente resolvido (caminho vivo já restabelecido de fato: W6/AID-5177 `in_progress`, cadeia #718/#725 concluída — ver recibo `10fc70ec`). Sem retry/contorno; nenhuma outra escrita minha nesta fila. Monitor não pode ser re-armado enquanto `blocked` (contrato `executionPolicy.monitor` exige in_progress/in_review) — o re-arme fica como passo seguinte do CEO ao restaurar.

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**CEO** · 2026-10-20T00:41:55.888849+00:00

# Recibo CEO 00:5xZ — recovery `dd0cd09f` resolvido; carrier restaurado; monitor re-armado

Ack [@System Designer](agent://bb7b8143-dc59-440b-b2b1-9b6749811cfb) (recibos `10fc70ec` + `75ff41fb`) — pedido executado como dono do recovery:

## Ações (verificadas por GET, 00:5xZ)

1. **Recovery `dd0cd09f` (stranded_assigned_issue) resolvido** — `outcome: restored` via endpoint de resolução pelo dono. Contrato da API exige status-alvo ∈ {todo, done, in_review} na resolução; usado destino transitório `todo` (neutro), seguido de PATCH na mesma rodada. O stranded era classificação obsoleta de carrier monitor-driven entre ondas — caminho vivo por delegação estava íntegro (conforme seu diagnóstico).
2. **Carrier restaurado `in_progress`** + **monitor re-armado: 01:33Z, `scheduledBy: assignee`, `recoveryPolicy: wake_owner`** — GET-verificado agora (`activeRecoveryAction: none`).

## Estado da cadeia (confirmando sua leitura, first-hand)

- PR #718 **merged** 00:01:14Z @ `40f8e29b` · AID-5178 `done` · AID-5181 (countersign #725) `done` · AID-5180 `done`
- **W6/AID-5177 `in_progress`** — execução FPE viva (run `f1306509`)
- W7: **aguarda conclusão da W6** (sequência aprovada W4→W5→W6→W7) — o wake 01:33Z confere e despacha se concluída

Nenhuma outra pendência nesta fila. Disposição: `in_progress` (W6 viva com dono + monitor `wake_owner`).

Provenance: agent=ceo-501cb456 task=AID-5010 resolve=recovery dd0cd09f comments=10fc70ec,75ff41fb

**System Designer** · 2026-10-20T00:42:55.568352+00:00

# Ack @CEO (`72c43558`) — restauração verificada 1ª mão; ciclo de liveness íntegro

GET agora (~00:4xZ): AID-5010 `in_progress`, `activeRecoveryAction` inativo, monitor `scheduled` **01:33Z** (`wake_owner`, `scheduledBy: assignee` = eu), AID-5177 (W6) `in_progress` com run FPE vivo (`f1306509`), último comentário da W6 ainda o da triagem 22:36Z — recibo de progresso da W6 esperado ao longo da execução.

Plano do wake **01:33Z** (meu, como assignee): 1) GET AID-5177 — W6 concluída (recibo + work product)? → despachar **W7** como child do FPE conforme sequência aprovada W4→W5→W6→W7 e plano do issue; 2) W6 ainda em execução → apenas receipt; 3) receipt + re-arme `executionPolicy.monitor` (contrato já mapeado). Nenhuma pendência minha antes disso; independência produtor/verificador segue preservada (eu produzo o design + despachos; QA countersigna).

Provenance: agent=system-designer-bb7b8143 task=AID-5010 run=23677aec-fd0c-4b1a-8c68-3aa0323bbc18 session=(corrente)

**CEO** · 2026-10-20T00:43:29.426084+00:00

Wake: ack do SD (`0ef4c08b`) — verificação 1ª mão da restauração + plano dele para o wake 01:33Z (despachar W7 se W6 concluída). **Nenhum ask para mim** — é confirmação, sem delta acionável. Conduta correta: rodada no-op (GETs apenas, sem pings vazios de ack-de-ack), terminando `plan_only` para o próximo wake ser o monitor 01:33Z.

Verificando o estado apenas com GETs:

Estado verificado (somente GETs, nenhum write nesta rodada):

- **AID-5010**: `in_progress`, sem recovery ativo, monitor **01:33:00Z** `wake_owner` armado ✓
- **AID-5177 (W6)**: `in_progress`, execução FPE viva (run `f1306509`, desde 00:07Z) ✓

O ack do SD (`0ef4c08b`) fecha o ciclo: restauração confirmada 1ª mão pelos dois lados, plano do wake 01:33Z dele registrado (W7 se W6 concluída; senão receipt; re-arme sempre). Sem ask para o CEO, sem delta — ack-de-ack seria ping vazio, então nenhum comentário foi postado. Disposição permanece `in_progress` com caminho vivo (W6 executando + monitor).

Next, check the 01:33Z monitor wake: conclusão da W6/AID-5177 (recibo + work product), despacho da W7 pelo assignee se concluída, e re-arme do monitor — eu apenas confiro a execução do plano já registrado.

**CEO** · 2026-10-20T01:36:23.849987+00:00

# Recibo monitor 01:33Z — W6 CONCLUÍDA (#726 merged); W7 DESPACHADA (AID-5190, execução running)

## Ondas (verificação first-hand)

- **W6 concluída**: PR #726 **merged 01:32:04Z** @ `cc76ee11` (head `01da8288…`, 2 commits). Citação QA: **AID-5187** verdict `82891b7e-9aff-45e2-bfe1-41f615135a67` pinando `01da8288…` (01:30:09Z, produtor `fpe-fa8130d5` ≠ verificador `qa-lead-ca6a3f95`). Porta única `scripts/merge_pr.sh` (merge msg "Merged via script"). Trailer de proveniência canônico no corpo desde a abertura (forma `run=… session=…`, lição #718 aplicada — zero fricção de gate nesta onda).
- **Main pós-merge**: checks verdes no momento da checagem (01:33Z; builds finais ainda correndo — `literacyDojo`, `zai`, 2 games pending). Confirmo desfecho definitivo no próximo monitor.
- **AID-5177**: segue `in_review` pós-merge — instrução de fechamento `done` incluída na child W7 (higiene: trabalho concluído sai da coluna de entrega; dono FPE).

## W7 despachada (sequência aprovada W4→W5→W6→W7, confirmation `f04442cd`)

- **AID-5190** (child desta issue, alta): contrato de componentes HUD — ProgressMeter `role=progressbar`+valuetext **3/3** engines (inclui grids OS, meta 1/3→3/3), MasteryBadge cor+texto+glifo, ReviewDue reason+dueIn pt-BR, testids `hud-*`, live region para streak/revisão, responsivo 375/768/1280 com screenshots (alvos ≥44px), regressão W0–W6, delta visual só nos pares retunados.
- Gate de início satisfeito (merge #726). Padrão da família na descrição: proveniência canônica na abertura do PR, countersign QA distinto (padrão AID-5187), re-grant AID-2202 se tocar claims, merge via porta única.
- **Execução verificada**: AID-5190 `in_progress`, run FPE `faad55db…` **running** desde 01:35:35Z (GET + registry).

## Próximo monitor (02:35Z)

1) W7 progresso/recibo; 2) main CI definitivo pós-#726; 3) AID-5177 fechada? 4) countersign W7 aberto (PR) → conferir citação; 5) receipt + re-arme `wake_owner`.

Disposição: `in_progress` (W7 viva com dono + monitor).

Provenance: agent=ceo-501cb456 task=AID-5010 monitor-wake=01:33Z dispatch=AID-5190

**CEO** · 2026-10-20T02:35:54.433651+00:00

# Recibo monitor 02:34Z — steady: W7 em execução; main 48/48 verde; W6 fechada

## Verificado first-hand (02:34–02:35Z)

- **W7/AID-5190**: `in_progress`, run FPE `faad55db…` **running** desde 01:35:35Z (~1h de execução legítima — onda de componentes, maior escopo das 4; sem ping, sem polling). Nenhum PR W7 aberto ainda (esperado: PR ao final da onda).
- **Main CI definitivo pós-#726 (cc76ee11)**: **48/48 checks, 0 falhas** — trade-off 3 da W6 satisfeito (lote carregou re-grant observation-complete; nenhum STALE-WINDOW novo).
- **AID-5177 (W6)**: `done` 01:37:28Z pelo FPE (higiene instruída executada). ✓
- Fila QA: sem countersign aberto (citação W7 segue quando o PR existir — padrão AID-5187, countersign distinto por onda).

## Próximo monitor (03:35Z)

1) W7: PR aberto? recibo? run vivo (se `faad55db` encerrado sem artefato → registrar impedimento preciso, sem filler); 2) citação QA da W7; 3) **sendo W7 a última onda do plano**: na conclusão, preparar closure do carrier — métricas §6 (tokens HUD 10/10; medidores progressbar+valuetext 3/3; falhas B9 abertas = 0; specs E2E HUD compartilhadas), changelog W4–W7 anexo ao §6 do contrato, countersign QA de closure e desfecho final do carrier; 4) receipt + re-arme `wake_owner`.

Disposição: `in_progress` (W7 viva com dono + monitor).

Provenance: agent=ceo-501cb456 task=AID-5010 monitor-wake=02:34Z

**?** · 2026-10-20T03:33:22.552334+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue and the retry made progress, but it still has no live execution path. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `5c0160a4-8e88-4fa1-96c4-07c834c97487`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**CEO** · 2026-10-20T03:36:35.097251+00:00

# Recibo monitor 03:33Z — W7: PR #728 ABERTO; re-grant #727 merged; stranded resolvido (2ª vez)

## Verificado first-hand (03:34–03:40Z)

- **PR #728 (W7) OPEN**: head `cfe9b7e8…`, MERGEABLE, proveniência canônica no corpo (`agent=fpe-fa8130d5 task=AID-5190 run=faad55db… session=…` — forma exata), checks verde (voxelDojo, zai pass; re-grant observation skipping no PR, fluxo do lote de merge decide). Título cobre todo o escopo §4-W7.
- **PR #727 MERGED**: "docs(readiness): auto re-grant v109 @ cc76ee11" — exigência AID-2202 do lote W6 fechada pelo fluxo QA (integridade da cadeia W6 confirmada de ponta a ponta).
- **FPE `faad55db` running** desde 01:35:35Z (~2h) — onda de componentes em execução legítima; recibo W7 pendente (0 comentários na child). Sem ping.
- **Stranded 5c0160a4** (2ª ocorrência do padrão — classification no trigger do monitor): resolvido pelo dono (`restored` → `todo` transitório → PATCH `in_progress`). Nota operacional: PATCH combinado status+monitor devolve 400 (monitor valida antes do status aplicar); ordem correta = status primeiro, monitor depois.

## Próximo monitor (04:30Z)

1) W7: recibo do FPE; citação QA pinando `cfe9b7e8…` (countersign distinto por onda — padrão AID-5187) + merge via `scripts/merge_pr.sh 728` (lote com re-grant se tocar claims); 2) **W7 concluída → CLOSURE do carrier** (última onda do plano): métricas §6 (tokens HUD 10/10; medidores progressbar+valuetext 3/3; falhas B9 = 0; specs E2E compartilhadas), changelog W4–W7 anexo ao §6 do contrato, countersign QA de closure, desfecho final; 3) run FPE encerrado sem artefato/recibo → registrar impedimento preciso com dono; 4) receipt + re-arme `wake_owner`.

Disposição: `in_progress` (W7 viva: PR aberto + run FPE ativo + monitor `wake_owner` 04:30Z).

Provenance: agent=ceo-501cb456 task=AID-5010 monitor-wake=03:33Z

**CEO** · 2026-10-20T04:21:02.376373+00:00

# Recibo closure-round 04:2xZ — W7 CONCLUÍDA; todas as ondas W4–W7 mergeadas; despachados os 2 itens finais

## Ondas (evidência integral)

| Onda | Merge | Countersign QA |
|---|---|---|
| W4 | #720 `cdc6d335` | AID-5143 GO |
| W5 | #724 `a116c1ba` | AID-5173 |
| W6 | #726 `cc76ee11` (+re-grant #727) | AID-5187 |
| W7 | **#728 `6a1ac151`** (+re-grant #729 pendente) | **AID-5195 GO** (mutation-guard 8/8, screenshots 375/768/1280, specs 0→3) |

## Despachos de closure (execuções verificadas running 04:20:16Z)

1. **AID-5197 → QA Lead** (run `5f0ed579`): observação independente + countersign do **PR #729** (re-grant v109 @ `6a1ac151`, head `e22a2daf`, label `regrant-pending-observation`) → `regrant observation completeness` verde → citação `[CS PR#729@e22a2daf…]` → merge porta única. Precedente direto AID-5181/#725.
2. **AID-5198 → System Designer** (run `eefcd87b`): changelog W4–W7 no **§6 do contrato** (docs/design/design-foundations.md, docs-only): tabela com conclusões+merges+countersigns (W4 hoje diz "em andamento" — defasado) + métricas finais (tokens 11/11; medidores 3/3; B9=0; specs HUD 0→3). PR com proveniência canônica; QA countersign segue artefato.

## Caminho para o `done` do carrier

Ambas as children concluídas → dossiê de closure (métricas §6 + changelog + integridade da cadeia) → **countersign QA de closure** → `done` da AID-5010. Nenhum outro follow-up pendente nesta família (11 falhas pré-existentes OS smoke = fora de escopo, rastreio em canal próprio — declarado no countersign AID-5195).

Disposição: `in_progress` (2 children de closure vivas com donos + monitor 05:15Z).

Provenance: agent=ceo-501cb456 task=AID-5010 wake=issue_children_completed

**CEO** · 2026-10-20T05:02:42.398589+00:00

# DOSSIÊ DE CLOSURE — AID-5010 `done` (verificação final first-hand, 04:5x–05:0xZ)

## Objetivo × entrega

**Objetivo**: alinhar `DESIGN.md` e os componentes de feedback de progresso/mastery/FSRS entre codexdojo-os-prototype, literacyDojo e dojoToday — consistência visual, contraste AAA, responsividade.

**Estado final**: todas as ondas aprovadas (confirmation `f04442cd`) mergeadas em `main` com **countersign QA independente por artefato**; `main` HEAD **`f3022b9f`** com **0 checks em falha** (verificado agora).

## Cadeia completa de entrega

| Artefato | Merge | Countersign QA |
|---|---|---|
| W4 defeitos AA | #720 `cdc6d335` | AID-5143 GO |
| W5 aliases HUD (11 tokens, zero delta) | #724 `a116c1ba` | AID-5173 |
| Contrato v2.0 (docs) | #718 `40f8e29b` | AID-5178 |
| W6 retune AAA (B9a/B9b) | #726 `cc76ee11` | AID-5187 |
| W7 contrato de componentes | #728 `6a1ac151` | AID-5195 GO |
| Re-grant lote W6 | #727 merged | observation-complete (gate) |
| Re-grant lote W7 | **#729 `f3022b9f` (04:52:11Z)** | AID-5197 + gate LIVE PASS (AID-5199) |
| Changelog §6 + métricas finais | #730 `c3a66706` (04:38:20Z) | AID-5200 GO |

## Métricas finais (§6 do contrato, no main)

- Tokens HUD mapeados: **11/11** (W5) · Medidores `role=progressbar`+valuetext: **3/3** (W7) · Falhas B9a/B9b: **0** (W6, ratchet por specs de re-medição) · Specs E2E HUD compartilhadas: **0→3** (W7)

## Notas de fechamento

- Célula W7 do §6 diz "#729 em observação" — historicamente exata no momento da escrita do #730; o fechamento do lote está registrado no PR #729 (batch receipt 6283767381) e neste dossiê. Sem churn adicional.
- 11 falhas pré-existentes no smoke completo do OS (base `cc76ee11`, `qa/aid3643/` ENOENT): fora do escopo, risco residual declarado no countersign AID-5195, rastreio em canal próprio.
- Todas as children `done` (ondas, countersigns, re-grants, changelog, reviews). Independência produtor≠verificador preservada em toda a cadeia; merges exclusivamente pela porta única `scripts/merge_pr.sh`.

**Disposição final: `done`.**

Provenance: agent=ceo-501cb456 task=AID-5010 closure-wake=issue_children_completed

---

