# Fundações de Design AiDevSchool — contrato de tokens, estados e componente do loop

**Versão:** v2.0 (2026-10-19) · **Extensão v2.0 (MAJOR):** proposta AID-5010 (doc `plan`,
rev `72b4e9ea`) — §7 Contrato do HUD de progresso + tier B9 — aprovada pela board
(confirmation `f04442cd`, aceita 2026-10-19T16:13Z). Janela de deprecação de 2 ciclos
para os valores AA-tuned afetados (ver §4 nota e §5).
**v1.0** (2026-09-09) · **Fonte canônica:** proposta AID-914 (doc `proposal`,
rev `70649549`), aprovada pela board (confirmation `4cd698d1`) e despachada em ondas
pelo sweep AID-1088/AID-1092. Publicado na W3 por ordem da CEO (AID-1096), execução FPE.
**Ownership (§2.4 da proposta):** a partir desta publicação o contrato é mantido pelo
**System Designer**; mecânica de implementação é do **FPE**; valores brutos e temas são
do **engine owner**; verificação independente é do **QA**; adoção como política e merges
são do **CEO/board**.

Este doc é a referência normativa: engines novas aderem ao contrato sem copiar código.

---

## 1. Núcleo semântico de tokens (v1 — 18 tokens)

Camada `foundation`, obrigatória para superfícies de lição/missão. O contrato exige
**existência e mapping**, não igualdade de valores: accents e radius permanecem
engine-local (identidade preservada — consistência sem apagar bounded contexts).

| Grupo | Token do contrato | Nota de mapping |
| --- | --- | --- |
| Cor·texto | `--ads-bg`, `--ads-text`, `--ads-muted` | literacy `--bg/--text/--muted`; dojoToday `--bg/--ink/--muted`; OS journey `--school-paper/--school-ink/--school-muted` |
| Cor·superfície | `--ads-surface`, `--ads-surface-strong`, `--ads-line` | literacy `--surface/--surface-strong/--border`; dojoToday `--card/--card/--line`; OS `#fff/--school-*` |
| Cor·ação | `--ads-primary`, `--ads-primary-strong`, `--ads-on-primary`, `--ads-primary-soft` | accent permanece engine-local em valor (violeta/verde/índigo) |
| Cor·feedback | `--ads-success-text`, `--ads-success-bg`, `--ads-error-text`, `--ads-error-bg` | literacy tem o par exato (referência de formato) |
| Cor·foco | `--ads-focus` | literacy `--focus`; OS `--school-focus`; dojoToday `--primary` |
| Forma | `--ads-radius` | valor engine-local (18/22/12) — 1 valor por engine |
| Elevação | `--ads-shadow-sm` | para estados pressed/hover comum |

### Política de alias (v1.0)

**Alias mínima vigente no main (embarcada na W2, AID-1089):**

- `--ads-focus` — dojoToday (`src/styles.css:37`), literacyDojo (`src/styles.css:848`),
  OS (`src/styles/foundation.css:38`)
- `--ads-success-text/bg` + `--ads-error-text/bg` — dojoToday e literacyDojo
  (containers de feedback); OS ainda sem pares (feedback usa cores locais)

**Deferral registrado:** a alias completa dos 18 tokens **não** existe no main.
Decisão W3 (AID-1096, critério §6 da proposta): **manter a mínima** — nenhuma onda
consumidora dos 13 tokens restantes existe ou está agendada; W2 consumiu exatamente a
mínima; W3 não cria novos consumidores (forced-colors usa system colors). A extensão
cabe à primeira onda que consumir o núcleo (pós-W3, decisão board). Critério de
remoção vigente nos dois sentidos: **alias sem adoção em 2 ciclos de readiness = remover**.

## 2. State contract (obrigatório para todo controle interativo)

Todo componente interativo (button, link, choice, input) define, **sem exceção**:

1. `rest`; 2. `:hover:not(:disabled)`; 3. `:active:not(:disabled)` **ou** equivalentes
`aria-` para teclado; 4. **`:focus-visible`** com outline ≥2px + offset ≥2px usando
`--ads-focus` (nunca `outline:none` sem substituto); 5. `:disabled` com aparência
própria (não apenas opacity) + `cursor:not-allowed`; 6. `loading` quando a ação for
assíncrona (controle desabilita + `aria-busy` + região `role=status`).

Containers de feedback (tenta/erro/acerto) devem: usar `aria-live="polite"
aria-atomic="true"`; comunicar estado por **cor + borda + texto** (nunca só cor);
preservar foco (heading `tabIndex{-1}` + foco programático no retry).

## 3. Contrato do componente canônico do loop tentativa/feedback/retry

Referência de fato: `literacyDojo` `LessonScreen` + `FeedbackPanel` (loop mais completo
e auditado). Referência de fato hoje para resultado de missão: OS `ResultScreen`.

### 3.1 Anatomia

```
<LoopStage>                      (região do loop de uma atividade)
├── <Instruction/>               h1/h2 com id; recebe foco (tabIndex{-1}) ao entrar/retentar
├── <ActivityInput/>             entrada tipada (choice/prompt/sort/compare/classify)
│     └── estados: rest | hover | focus-visible | active | disabled(+loading c/ aria-busy)
│     └── checks falhando marcados (aria-invalid + affordance não-color)
├── <FeedbackPanel/>             aria-live="polite" aria-atomic="true"
│     ├── <Summary/>             1 frase: o que passou / o que falta
│     ├── <Score/>               (opcional) só quando falhou
│     ├── <CheckList/>           1 item por check falho: "ainda falta X" — específico
│     └── <Hints/>               dicas progressivas numeradas, nunca resposta pronta
├── <ActionBar/>
│     ├── [Verificar resposta]   primário; disabled até resposta mínima + durante submitting
│     ├── [Verificar de novo]    mesmo rótulo de estado re-tentativa (submete de novo)
│     ├── [Tentar novamente]     limpa a tentativa, preserva dicas vistas
│     ├── [Pedir dica]           progressiva; some quando esgotadas
│     └── [Próxima atividade]    só após pass
└── <ProgressNote/>              "completed ≠ mastered" quando relevante (micro-lesson-contract)
```

### 3.2 Contrato de estados do loop

| Estado do loop | UI | A11y |
| --- | --- | --- |
| idle | input habilitado, submit disabled até mínimo | — |
| submitting | submit disabled + rótulo/indicador de carga | `aria-busy` no stage |
| feedback:pass | painel success (texto+borda+cor), próxima ação inequívoca | live polite; foco permanece |
| feedback:fail | painel error + CheckList específico + score opcional | live polite; checks em texto |
| retry | input limpo, dicas preservadas, foco volta à instrução | foco programático na instrução |
| hint | dica nova anexada numerada | live polite |
| erro de sistema | painel `role="alert"` + ação de recuperação | never silencioso |

### 3.3 Critérios de aceite (QA-verificáveis)

1. Um aprendiz consegue: tentar → ler feedback específico por check → pedir dica →
   retentar → perceber progresso (micro-lesson-contract §aceite 3).
2. Todo controle do loop cumpre o state contract (§2) — verificável por teclado.
3. Feedback é anunciado a leitores de tela (live region) e compreensível sem cor
   (B3) e em forced-colors (B7 — wave 1 W3; completa nas próximas ondas).
4. `data-testid` estáveis para os papéis de ação (`submit-attempt`,
   `retry-activity`, `hint-button`, `next-activity`, `feedback-panel`), para reuso
   de specs E2E entre engines.
5. Nenhum estado do loop marca `mastered`; progresso de experiência no máximo
   `completed` (boundary do micro-lesson-contract — inegociável).

### 3.4 Mapeamento de papéis por engine (W3)

Nem todo papel existe em toda engine; o que existe cumpre o contrato:

| Papel (testid) | literacyDojo | codexDojo OS | dojoToday |
| --- | --- | --- | --- |
| `feedback-panel` | `FeedbackPanel` (`feedback-panel`) | região de verificação do `ResultScreen` | `#soc-reply` (role=status) |
| `submit-attempt` | botão Verificar/Verificar de novo | — (missão hospedada é o loop da literacy) | `#soc-send` (Perguntar ao Sócrates) |
| `retry-activity` | botão Tentar novamente | botões Tentar verificação/salvar novamente | — (re-submit pelo mesmo controle) |
| `hint-button` | botão Pedir dica | — | — (nudge determinístico no feedback) |
| `next-activity` | botão Próxima atividade | — (saída é Voltar ao hub) | — |
| erro de sistema | — | `role="alert"` no save failed + SupportCta | fallback determinístico (nunca silencioso) |

## 4. Baseline de acessibilidade (política de tier)

Mapeia para as severidades do readiness (`policy.yaml`: critical/high → **block**;
medium/low → **disposition-required**), via `invalidatingChanges: accessibility`
já vigente — nenhum mecanismo novo.

| # | Checagem | Severidade inicial | Tratamento |
| --- | --- | --- | --- |
| B1 | Foco visível em 100% dos controles interativos (outline ≥2px + offset ≥2px) | high | block |
| B2 | Contraste AA 4.5:1 texto normal nos fluxos canônicos | high | block |
| B3 | Feedback não depende só de cor (cor + borda/ícone/texto) | high | block |
| B4 | `aria-live`/`role=status\|alert` em feedback assíncrono e resultado | medium → block no v2 | disposition-required |
| B5 | `prefers-reduced-motion` guard global | medium → block no v2 | disposition-required |
| B6 | Alvo de toque ≥44px nos controles primários mobile | medium | disposition-required |
| B7 | `forced-colors` compatível nos controles do loop | low → medium (v2) → high (v3) | disposition-required |
| B8 | `.sr-only` disponível e usado | low | disposition-required |
| B9a | **HUD (§7) apenas:** texto ≥7:1 (AAA; large text ≥4.5:1) nos 4 papéis | high (v2.0) | block |
| B9b | **HUD (§7) apenas:** não-texto (track/fill/accent/glifo) ≥3:1 (WCAG 1.4.11) | high (v2.0) | block |
| B9c | `role="progressbar"` com `valuetext` em 100% dos medidores do HUD | medium → block no v3 | disposition-required |

**Wave 1 do B7 (W3, esta onda):** nos controles/containers do loop das 3 engines,
`@media (forced-colors: active)` garante que borda e outline **sobrevivem** a system
colors e que a distinção pass/fail/inválido exista **sem cor** (largura/estilo de
borda: fail e inválido = dashed; pass e selecionado = solid ≥3px). Preferimos
geometria + system colors a `forced-color-adjust: none` (não quebramos temas de alto
contraste do usuário).

**Escopo do B9 (v2.0):** aplica-se **somente** às superfícies de HUD definidas no §7
(leitura diária de progresso); B2 (AA 4.5:1) permanece o piso geral do produto. A
elevação de severidade (AA→AAA no HUD) é mudança MAJOR coberta pela janela de
deprecação do §5: os valores AA-tuned das auditorias AID-914/1023/1027 que hoje não
atingem 7:1 (`--muted` #686378 e par mastered #166534/#dcfce7 no dojoToday, e pares
equivalentes) são marcados `/* @deprecated → --ads-* (B9) */` na W5 e retunados na W6;
remoção verificada 2 ciclos de readiness após a W6.

## 5. Versionamento e deprecação

- `vMAJOR.MINOR` neste doc + changelog datado. Breaking (remover/renomear token do
  núcleo, subir severidade de check a11y) = MAJOR com janela de deprecação de
  **2 ciclos de readiness**; MINOR = adição.
- Deprecação: nome legado marcado `@deprecated → --ads-*` no CSS da engine; remoção
  ao fim da janela, verificada por grep-audit do SD (produtor) **e** QA countersign
  (verificador). Funciona nos dois sentidos: alias sem adoção em 2 ciclos = remover.

## 6. Changelog de ondas

| Onda | Conteúdo | Status |
| --- | --- | --- |
| W0 | Defeitos: dojoToday `:focus-visible` + `--muted` ≥4.5:1; OS `--text` fantasma | merge `58791cb7` (PR #297, re-grant v36, QA countersign AID-1024 CONFORME) |
| W1 | Defeito AA: dojoToday `.is-mastered .track-glyph` 3.0:1→6.49:1 — a "alias layer" completa da proposta ficou deferral | merge `cf85504c` (PR #298, re-grant v37, QA countersign AID-1033 CONFORME) |
| W2 | State contract §2.3 nos controles do loop das 3 engines — **embarcou a alias mínima** que referencia (`--ads-focus` + pares de feedback onde há container) | merge `14121556` (PR #303, re-grant v38, QA countersign AID-1099 GO) |
| W3 | Este doc (padrão documentado) + adesão §4 FeedbackPanel/ResultScreen + forced-colors wave 1 (B7) | merge via PR AID-1096 |
| W4 | Defeitos AA vigentes (B2, independentes do v2.0): dojoToday `.tone-success .chip` 3.30:1 → fundo `#166534` (7.13:1); OS journey `--school-muted` sobre wash `--school-primary-soft` 4.31:1 → `#3f4a64` local (7.68:1) | **done** — merge `cdc6d335` (PR #720, head `628e2ba4`; child AID-5080/FPE; QA countersign AID-5143 GO) |
| v2.0 | Este change: §7 Contrato do HUD de progresso + tier B9 + 11 tokens HUD | merge `59111827` (PR #718; QA countersign AID-5178) |
| W5 | Aliases HUD `--ads-*` (11 tokens) nas 3 engines mapeando valores vigentes — zero delta visual; valores AA-tuned marcados `@deprecated → --ads-* (B9)` (janela §5); seção "Progress HUD" nos 3 DESIGN.md | **done** — merge `a116c1ba` (PR #724, head `b58a3d08`; QA countersign AID-5173) |
| W6 | Retune AAA (B9a/B9b) dos pares HUD nas 3 engines + extremo `progress-fill` literacy ≥3:1 (1.4.11); remoção dos nomes deprecados ao fim da janela (specs de re-medição travam o ratchet) | **done** — merge `cc76ee11` (PR #726, head `01da8288`; QA countersign AID-5187; re-grant do lote: PR #727 merged) |
| W7 | Contrato de componentes HUD: `ProgressMeter` `role="progressbar"`+`valuetext` 3/3 (inclui grids OS), `MasteryBadge`, `ReviewDue` pt-BR, testids `hud-*`, live region, responsivo 375/768/1280 | **done** — merge `6a1ac151` (PR #728, head `e857eef8`; QA countersign AID-5195 GO — mutation-guard 8/8, screenshots 375/768/1280; re-grant do lote: PR #729 em observação — child QA AID-5197) |

**Ondas aprovadas (confirmation AID-5010 `f04442cd`, 2026-10-19; W4–W7 concluídas
2026-10-19/20 — merges e countersigns na tabela acima):** W5 aliases HUD
(zero delta visual; + seção "Progress HUD" nos 3 DESIGN.md) → W6 retune AAA (B9a/B9b) →
W7 contrato de componentes (anatomia/testids/a11y funcional). Sequência única entre
ondas; FPE executa, QA countersign por onda, merge via `scripts/merge_pr.sh`.

**Métricas de adoção** (acompanhamento da board): % de controles do loop com state
contract completo por engine; nº de tokens do núcleo mapeados (v1: 5/18 — mínima);
nº de falhas B1–B3 abertas por ciclo. **Métricas HUD (v2.0) — finais pós-W7
(2026-10-20):** tokens HUD mapeados **11/11** (W5 — PR #724); medidores com
`role="progressbar"`+`valuetext` **3/3** (W7 — PR #728); falhas B9a/B9b abertas
**0** (W6 — PR #726; specs de re-medição travam o ratchet); specs E2E HUD
compartilhadas entre engines **0→3** (`hud-contract.spec.ts` em dojoToday e
literacyDojo + `hud-contract.smoke.spec.ts` no OS). Sucesso = adoção **e**
verificação independente (countersign QA distinto por onda — tabela acima).

## 7. Contrato do HUD de progresso (v2.0 — AID-5010)

O HUD de progresso é a superfície de leitura diária "onde estou" (streak, progresso de
trilha, mastery, revisão FSRS). Unificação é **contratual** (papéis, estados, a11y,
testids) — **não** paleta única. Auditado em AID-5010 (doc `plan` rev `72b4e9ea`:
medição WCAG dos 3 HUDs; 0/13 pares de texto ≥7:1; 3 anatomias divergentes).

### 7.1 Núcleo semântico HUD (11 tokens)

Mesma regra do §1: o contrato exige **existência e mapping**, não igualdade de valores.

| Grupo | Token do contrato | Nota de mapping |
| --- | --- | --- |
| Cor·progresso | `--ads-progress-text`, `--ads-progress-muted` | rótulos/números do HUD (≥B9a); mapeiam os muted/ink locais |
| Cor·medidor | `--ads-progress-track`, `--ads-progress-fill` | não-texto ≥3:1 entre si e contra o fundo (1.4.11) |
| Cor·streak | `--ads-streak-accent` | ícone/chama (não-texto ≥3:1; decoração permanece `aria-hidden`) |
| Cor·mastery | `--ads-mastery-text`, `--ads-mastery-bg` | par atômico (nunca recombinar); formato de referência: pares da literacy |
| Cor·revisão | `--ads-review-text`, `--ads-review-bg` | revisão devida (due) |
| Cor·atenção | `--ads-attention-text`, `--ads-attention-bg` | atrasada (overdue)/atenção — separada de revisão devida |

### 7.2 Anatomia canônica (papéis; cada engine mantém sua pele)

```
<ProgressHud>
├── <StreakChip/>            texto "N dias" + glifo aria-hidden; mudança anunciada (role=status ou live polite, 1×/dia)
├── <ProgressMeter/>         role="progressbar" OBRIGATÓRIO com aria-valuenow/min/max
│                            + valuetext "N% concluído" + leitura textual "X/Y <termo>"
│                            sempre adjacente (nunca só barra)
├── <MasteryBadge/>          estado visível por cor + texto + glifo (B3); nunca apenas cor
│                            vocabulário canônico: dominada/verificada ≠ concluída (completed ≠ mastered)
└── <ReviewDue/>             reason overdue|due + dueIn em texto legível pt-BR
                             ("atrasada 43 dias" / "devida hoje")
```

- Termos canônicos pt-BR: "dominadas" (verificadas), "concluída" (local), "devida
  hoje", "atrasada", "sequência".
- `data-testid` estáveis para reuso E2E: `hud-streak`, `hud-progress`,
  `hud-mastery-badge`, `hud-review-due`.
- Estados do medidor: rest / loading (`aria-busy`) / error (fallback textual
  determinístico, nunca silencioso).

### 7.3 Responsividade

Mobile-first: empilhamento vertical dos 4 papéis abaixo de 768px; ≥2 papéis lado a
lado só ≥768px. Alvos de toque ≥44px em qualquer controle do HUD (B6). Verificação em
375/768/1280 (breakpoints já vigentes no OS).

### 7.4 Bounded context (o que NÃO muda)

- Valores brutos, accent, radius e personalidade permanecem engine-local (o DESIGN.md
  de cada engine continua sendo a identidade; a regra "não copiar tokens entre
  engines" do DESIGN.md raiz é preservada — compartilha-se o papel semântico `--ads-*`
  e a anatomia).
- **Boundary de mastery (micro-lesson-contract):** HUD local mostra no máximo
  `completed`; `dominada/verificada` só a partir da projeção canônica do substrate.
  Nenhuma HUD marca mastery.
- FSRS permanece fora do escopo do OS (read-only por design); a ausência é
  documentada, não tratada como dívida.
