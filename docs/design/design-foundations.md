# Fundações de Design AiDevSchool — state contract, alias `--ads-*` e componente canônico do loop

- **Versão:** v1.0.0 (2026-09-09) — changelog no fim do doc.
- **Fonte canônica:** proposta AID-914 (doc `proposal`, rev `70649549`) §2–§4,
  aprovada pela board. Ondas já pousadas no `main`: W0/W1 de correção de defeitos
  (PRs #297/#298) e **W2 state contract** (PR #303, merge `1412155`).
- **Ownership (proposta §2.4):** contrato/núcleo/state contract/baseline = **System
  Designer**; mecânica de implementação (alias, build, custo) = **FPE**; valores brutos
  e extensões = **engine owner**; verificação independente = **QA**; adoção/merges =
  **CEO/board**.
- **Nota de bootstrap:** este doc foi criado pelo FPE na W3 sob mandato CEO
  (AID-1092/B, ordem AID-1096): o SD não o publicou antes da W2 e a W2 usou o doc
  `proposal` da AID-914 como fonte (registrado no receipt AID-1089). Alterações
  futuras no **conteúdo do contrato** voltam a ser propostas pelo SD conforme §2.4;
  o FPE mantém a mecânica e os exemplos.

---

## 1. State contract (todo controle interativo) — **landed na W2**

Todo componente interativo (button, link, choice, input) das superfícies de
lição/missão define, **sem exceção** (proposta §2.3):

1. `rest`;
2. `:hover:not(:disabled)`;
3. `:active:not(:disabled)` **ou** equivalente `aria-` para teclado;
4. **`:focus-visible`** com outline ≥2px + offset ≥2px usando `--ads-focus`
   (nunca `outline:none` sem substituto);
5. `:disabled` com aparência própria (não apenas `opacity`) + `cursor:not-allowed`;
6. `loading` quando a ação for assíncrono: controle desabilita + `aria-busy` +
   região `role="status"`.

**Containers de feedback** (tenta/erro/acerto): `aria-live="polite"
aria-atomic="true"`; estado comunicado por **cor + borda + texto** (nunca só cor);
foco preservado no retry (heading `tabIndex{-1}` + foco programático).

Referências pousadas: `engines/dojoToday/src/styles.css` (bloco W2 §531–693),
`engines/literacyDojo/src/styles.css` (W2 §172–260), OS
`engines/codexdojo-os-prototype/src/styles/{foundation,journey}.css`.

---

## 2. Alias semântica `--ads-*` — estado atual e decisão

### 2.1 Inventário no main @ `1412155` (W3 kickoff, AID-1096 comentário `6f13791a`)

Alias **mínima** (o que a W2 realmente embarcou — 32 hits grep / 5 arquivos):

| Engine | Arquivo | Tokens mapeados |
| --- | --- | --- |
| dojoToday | `engines/dojoToday/src/styles.css` | `--ads-focus: var(--primary)`, `--ads-error-text: var(--danger)`, `--ads-error-bg: var(--danger-soft)`, `--ads-success-text: var(--success-deep)`, `--ads-success-bg: var(--success-soft)` |
| literacyDojo | `engines/literacyDojo/src/styles.css` | `--ads-focus: var(--focus)`, `--ads-error-text/--ads-error-bg/--ads-success-text/--ads-success-bg` (pares exatos de feedback) |
| OS (codexdojo-os-prototype) | `.../src/styles/foundation.css` | `--ads-focus: var(--school-focus)` |

**A alias completa de 18 tokens (proposta §2.2) é deferral registrado** — a W1
original da §2.5 nunca pousou como onda de alias (as PRs #297/#298 foram as ondas
W0/W1 de *correção de defeitos*; premissa corrigida no kickoff da W2, receipt
AID-1089 comentário `5f1362dd`).

### 2.2 Política de decisão (critério §6 da proposta)

- Alias existe para **servir o contrato**, não como fim: um token `--ads-*` entra
  somente quando um consumidor do state contract/loop o referencia.
- **Critério de poda:** alias sem adoção em 2 ciclos de readiness = remover
  (registered no changelog).
- Estender para a alias de 18 tokens é decisão de onda futura (board), não
  implícita da W3. Proposta de decisão da W3 vai no PR da onda (escopo AID-1092/B
  item 3).

---

## 3. Componente canônico do loop tentativa/feedback/retry (W3)

Referência de fato: `literacyDojo` `LessonScreen` + `FeedbackPanel` (o loop mais
completo e auditado). Engines aderem **ao contrato**, não copiando código.

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

### 3.3 `data-testid` canônicos (reuso de specs E2E entre engines)

| Testid | Papel | Referência |
| --- | --- | --- |
| `submit-attempt` | submeter/verificar a tentativa | literacy `LessonScreen.tsx:338` |
| `retry-activity` | limpar tentativa e retentar (foco → instrução) | literacy `LessonScreen.tsx:350` |
| `hint-button` | pedir dica progressiva | literacy `LessonScreen.tsx:360` |
| `next-activity` | avançar só após pass | literacy `LessonScreen.tsx:370` |
| `feedback-panel` | container de feedback live region | literacy `FeedbackPanel.tsx:17` |

### 3.4 Critérios de aceite (QA-verificáveis)

1. Um aprendiz consegue: tentar → ler feedback específico por check → pedir dica →
   retentar → perceber progresso (micro-lesson-contract §aceite 3).
2. Todo controle do loop cumpre o state contract (§1 deste doc) — verificável por
   teclado.
3. Feedback é anunciado a leitores de tela (live region) e compreensível sem cor
   (B3) e em forced-colors após W3 (B7, §4).
4. `data-testid` estáveis para os 5 papéis de ação (§3.3).
5. **Nenhum estado do loop marca `mastered`;** progresso de experiência no máximo
   `completed` (boundary do micro-lesson-contract — inegociável).

### 3.5 Adesão atual por engine (baseline W3; gaps = trabalho da onda)

| Engine | Superfície do loop | Estado vs §3 |
| --- | --- | --- |
| literacyDojo | `LessonScreen` + `FeedbackPanel` | **Referência canônica** — 5/5 testids, live regions, dicas numeradas, retry com foco |
| OS | `MissionStatusControls` + `ResultScreen` + `MentorPanel` | W2 pousou state contract + `role=status` + foco programático no retry; testids canônicos do §3.3 = gap parcial (usa ids próprios: `completion-is-not-mastery`, `independent-verdict`) |
| dojoToday | Sócrates (`.socrates-*`) + controles de missão | Superfície read-only (sem loop de tentativa completo por design); W2 pousou state contract + `.is-error` cor+borda+texto; adesão ao §3 limitada ao que faz sentido numa superfície read-only (feedback de erro + loading assíncrono) |

---

## 4. `forced-colors` wave 1 (baseline B7)

**Problema:** em `@media (forced-colors: active)` o navegador substitui a paleta
por system colors e suprime `box-shadow`/`filter`/backgrounds decorativos — o
state contract da W2 perderia bordas de botão (sombra 3D), affordances de hover e
a distinção visual pass/fail dependeria só do texto.

**Regras da wave 1 (controles do loop, 3 engines):**

1. **Todo controle primário ganha `border` explícito ≥2px** no forced-colors (a
   sombra 3D some; sem borda o botão vira um retângulo sem aresta).
2. **`:disabled` mapeia para `GrayText`** (aparência própria continua distinguível).
3. **Outline de foco permanece** (`outline` sobrevive a forced-colors; nunca
   remover `:focus-visible`).
4. **Containers de feedback mantêm borda ≥2px** (`feedback-pass`/`feedback-fail`/
   `.is-error`): pass/fail continuam distinguíveis por estrutura + texto (B3),
   não só por cor.
5. Sem `forced-color-adjust: none` nesta wave (preserva o mapeamento de contraste
   do UA; exceções só com caso comprovado + countersign QA).

Verificação: emulação Playwright `page.emulateMedia({ forcedColors: 'active' })` +
asserções de `border-*-width/style` computado e preservação de outline — evidência
de produtor; QA re-executa independente (countersign).

---

## 5. Versionamento e changelog (proposta §2.4)

- `vMAJOR.MINOR`; breaking (remover/renomear token do núcleo, subir severidade de
  check a11y) = MAJOR com janela de deprecação de 2 ciclos de readiness; MINOR =
  adição.
- Deprecação: nome legado `@deprecated → --ads-*` no CSS da engine; remoção ao fim
  da janela, verificada por grep-audit do SD (produtor) **e** QA countersign.

| Versão | Data | Mudança |
| --- | --- | --- |
| v1.0.0 | 2026-09-09 | Bootstrap pelo FPE (mandato AID-1092/B): state contract §2.3 como pousado na W2 (PR #303 `1412155`), inventário da alias mínima `--ads-*` + deferral dos 18 tokens, contrato do loop §4 da proposta (anatomia/estados/testids/aceite), padrão forced-colors wave 1 (B7) |
