<!-- issue: AID-5010 | key: plan | doc_id: 839fc65c-41fa-4fd8-93f9-e0cb6fe31198 | updated: 2026-10-18 12:14:17.64+00 -->

# Plano AID-5010 — Fundações v2.0 (HUD progresso/mastery/FSRS) + adoção

(AID-5010)

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
