<!-- issue: AID-914 | key: proposal | doc_id: 04981129-c7e2-4725-aefd-3acb3babd10a | updated: 2026-09-06 13:14:38.042+00 -->

# AID-914 — Proposta: fundações de design (auditoria + token/state contract mínimo + baseline a11y por tier + esboço do loop tentativa/feedback/retry)

(AID-914)

# Proposta — Fundações de Design AiDevSchool: token/state contract mínimo + baseline a11y como critério de readiness

| Campo | Valor |
| --- | --- |
| Status | **Proposta — aguarda decisão de board (CEO)** |
| Autor | System Designer (bb7b8143), 2026-09-06 |
| Evidência | Auditoria first-hand no checkout `505e7a6c` (main, 2026-09-06) |
| Escopo | literacyDojo, dojoToday, codexdojo-os-prototype (3 engines live) |
| Não faz | Conteúdo/curriculum (lane Content), merges (single-writer = CEO), código sem issue aprovada |

---

## 1. Auditoria das fundações (constatações first-hand)

Contagens próprias por varredura de CSS/TSX no `505e7a6c`. Divergem das contagens
AID-905 (~200/91/24) porque aqui conto **declarações únicas de custom properties**
(`--x:`), não ocorrências brutas; a divergência metodológica não muda a conclusão
(nenhum mapping comum existe).

### 1.1 Tokens

| Métrica | literacyDojo | dojoToday | OS |
| --- | --- | --- | --- |
| Arquivos CSS | 1 (2.376 linhas) | 1 (674 linhas) | 8 (~1.217 linhas) |
| Tokens declarados (`:root`) | 28 | 21 | 34 (14 shell escuro + 20 `--school-*` claro) |
| Usos `var()` | 170 | 69 | 266 |
| Nomenclatura | semântica parcial (`--bg/--text/--primary/--mint`) | própria (`--ink/--card/--trap`) | dois namespaces (`--school-*` + shell semântico) |
| `:root` único? | sim | sim | sim (foundation.css:1) |

**Constatações:**

1. **Sem fundação compartilhada.** Não existe arquivo de tokens compartilhado, doc de
   design system, nem alias semântico comum (confirmado: `engines/shared/` contém só
   primitivas de teaching-evidence; nenhum `*token*` de design no repo).
2. **Mesmo nome, valores divergentes.** `--coral` = `#ff7d66` (literacyDojo:800) vs
   `#ff755d` (OS foundation.css:13) vs `#f16d4f` (dashboard codexDojo — fora do escopo,
   citado como agravante). `--radius` = 18px (literacyDojo:807) vs 22px (dojoToday:22);
   OS usa 12–14px em componentes.
3. **Duplicação latente em vez de mapping.** O OS re-declara a paleta do literacyDojo
   com prefixo próprio: `--school-paper #f8f4ea` == literacy `--bg`,
   `--school-ink #17213a` == `--text`, `--school-muted #657089` == `--muted`,
   `--school-line #d9d3c7` == `--border` (foundation.css:21-26) — mas o acento diverge:
   `--school-primary #315c4c` (verde) vs literacy `--primary #6657e8` (violeta).
   Copiar valor não é compartilhar contrato: qualquer evolução de paleta bifurca de novo.
4. **Token fantasma (defeito latente).** `var(--text)` usado em
   `engines/codexdojo-os-prototype/src/styles/engine-hub.css:60` **sem declaração no
   contexto OS** → declaração inválida no computed-value time; a cor efetiva é herdada.
   É o sintoma exato da ausência de contrato: nome colidindo entre engines sem checagem.
5. **Escala de cinza/superfície inconsistente:** literacy tem 3 superfícies nomeadas
   (`--surface/--surface-strong`); dojoToday usa `--card`; OS usa `--panel/--panel-solid/
   --panel-soft`. Sem equivalência declarada, tema claro/escuro e contraste não podem
   ser auditados de forma uniforme.

### 1.2 Estados de interação

| Padrão | literacyDojo | dojoToday | OS |
| --- | --- | --- | --- |
| `:focus-visible` | 6 regras — outline 3px `--focus` offset 2px (styles.css:196-202) | **0 regras** (só `.socrates-input:focus`, styles.css:570) | 9 regras — shell: 2px `--cyan` offset 2px (foundation.css:40-43); journey: 3px `--school-focus` offset 3px (foundation.css:48-51) |
| `:hover` | 3 | 1 | 17 |
| `:active` (press) | 5 (transform + shadow) | 0 | 0 |
| `:disabled` | 8 (cor dedicada + `cursor:not-allowed`) | 1 (`opacity:.5`) | 4 |
| `prefers-reduced-motion` | 2 blocos (global + voxel) | 1 bloco global | 4 blocos (journey anima só com `no-preference` — melhor prática atual) |
| `forced-colors` | **0** | **0** | **0`** |

**Constatações:**

6. **Foco visível: 3 especificações diferentes e 1 ausência crítica.** literacy 3px/2px,
   OS shell 2px/2px, OS journey 3px/3px, dojoToday **nenhum estilo de foco em botões**
   (`.btn`, `.link-btn` sem outline — navegação por teclado sem feedback visível).
7. **Estados opcionais tratados como preferência local:** hover existe em 3/1/17 regras;
   active/press em 5/0/0; disabled com 3 tratamentos distintos (cor dedicada vs
   opacity vs regra pontual). Nenhuma engine cobre o conjunto completo — a divergência
   de cobertura entre engines citada no AID-905 confirma-se.
8. **`forced-colors` ausente em 100% das superfícies** (0 ocorrências nas 3 engines) —
   confirmado. Nenhum `system-color` fallback, nenhum `forced-color-adjust`.

### 1.3 Responsivo/móvel

| Métrica | literacyDojo | dojoToday | OS |
| --- | --- | --- | --- |
| Estratégia | mobile-first declarado (styles.css:1) | coluna única `max-width:30rem` | shell desktop `overflow:hidden`, missões em janela |
| Breakpoints | 480 / 560 / 820 | **nenhum** | 375 / 420 / 560 / 760 / 768 / 820 / 900 / 1040 / 1280 |
| Alvo de toque | ≥48px (`.btn` styles.css:125-131) | ≥44px | ≥44px no journey (foundation.css:46; journey.css:42,303,342) |

**Constatações:**

9. **Breakpoints não compartilham escala:** OS usa 9 breakpoints ad-hoc; literacy 3;
   dojoToday nenhum (coluna única funciona, mas é decisão implícita, não contrato).
10. **Alvo de toque ≥44px é a única convergência de fato** nos 3 engines — nenhum doc
    a reivindica como regra; cada um chegou lá sozinho (44/44/48px).

### 1.4 Acessibilidade

| Métrica | literacyDojo | dojoToday | OS |
| --- | --- | --- | --- |
| atributos `aria-*` (TSX/TS) | 52 | 11 | 57 |
| `role="status"/"alert"` | 4 | 0 | 18 |
| `aria-live` | 3 | 1 | 5 |
| `.sr-only` | 1 | 0 | 1 |
| `onClick` em não-botão | 0 | 0 | 0 |
| Contraste (amostra token principal de texto) | PASS 4.52–14.54 | **FAIL `--muted` #8a83a0 sobre #fdf6ec = 3.35:1** em ≥5 regras com texto real 0.78–0.85rem (styles.css:52,213,283,461,466,651) | PASS 4.52–17.14 |

**Constatações:**

11. **dojoToday tem falha AA comprovada**: `--muted` em 3.35:1 usado em texto de corpo
    (`.muted`, `.streak-freezes`, `.lesson-project`, `.track-num`). Duas engines
    passam na amostra testada; a que falha é justamente a que não tem focus-visible
    nem `role=status/alert`.
12. **Padrão a11y mais maduro já existe e é seguido de forma desigual**: literacyDojo
    (aria-live no feedback, sr-only, foco no heading via `tabIndex{-1}`, feedback
    pass/fail com cor + borda + texto — não só cor) e OS journey (44px, role=status,
    reduced-motion opt-in) cada um implementou metade do que o outro também
    implementou. Não é falta de conhecimento; é falta de contrato comum.
13. **Não existe checagem automática de a11y em nenhum pipeline** das 3 engines
    (sem axe/lighthouse no CI; readiness policy já trata `accessibility` como mudança
    invalidante em policy.yaml:40, mas sem critério verificável de checklist).

---

## 2. Proposta — token/state contract mínimo

### 2.1 Princípios

- **Alias semântico, não big-bang.** Cada engine mantém seus valores brutos e sua
  identidade (o OS escuro permanece escuro; o journey claro permanece claro). O
  contrato define **nomes semânticos** que cada engine **mapeia** a partir dos seus
  valores locais numa camada de alias `:root` local. Zero paralelismo visual imposto.
- **Bounded contexts preservados.** O contrato é floor comum, não teto. Extensões
  engine-local (`--trap` do dojoToday, `--voxel-*`, shell dark do OS) continuam
  válidas e engine-owned; só não podem colidir semanticamente com os nomes do contrato.
- **Correção antes de consistência.** A onda 1 corrige defeitos comprovados
  (focus invisível, contraste AA, token fantasma) sem esperar adoção ampla.

### 2.2 Núcleo semântico proposto (v1 — 18 tokens)

Camada `foundation` (obrigatória para superfícies de lição/missão):

| Grupo | Token do contrato | Nota de mapping |
| --- | --- | --- |
| Cor·texto | `--ads-bg`, `--ads-text`, `--ads-muted` | literacy: `--bg/--text/--muted`; dojoToday: `--bg/--ink/--muted`(→**precisa escurecer p/ AA**); OS journey: `--school-paper/--school-ink/--school-muted` |
| Cor·superfície | `--ads-surface`, `--ads-surface-strong`, `--ads-line` | literacy `--surface/--surface-strong/--border`; dojoToday `--card/--card/--line`; OS `#fff/--school-*` |
| Cor·ação | `--ads-primary`, `--ads-primary-strong`, `--ads-on-primary`, `--ads-primary-soft` | accent **permanece engine-local em valor** (violeta/verde/índigo) |
| Cor·feedback | `--ads-success-text/bg`, `--ads-error-text/bg` | literacy já tem o par exato (referência de formato) |
| Cor·foco | `--ads-focus` | literacy `--focus`; OS journey `--school-focus`; dojoToday a definir ≥AA vs bg |
| Forma | `--ads-radius` | valor engine-local (18/22/12) — o contrato exige **existência e 1 valor por engine**, não igualdade |
| Elevação | `--ads-shadow-sm` | para estados pressed/hover comum |

### 2.3 State contract (obrigatório para todo controle interativo)

Todo componente interativo (button, link, choice, input) define, **sem exceção**:

1. `rest`; 2. `:hover:not(:disabled)`; 3. `:active:not(:disabled)` **ou** equivalentes
`aria-` para teclado; 4. **`:focus-visible`** com outline ≥2px + offset ≥2px usando
`--ads-focus` (nunca `outline:none` sem substituto); 5. `:disabled` com aparência
própria (não apenas opacity) + `cursor:not-allowed`; 6. `loading` quando a ação for
assíncrona (o controle desabilita + `aria-busy` + região `role=status`).

Containers de feedback (tenta/erro/acerto) devem: usar `aria-live="polite"
aria-atomic="true"`; comunicar estado por **cor + borda + texto** (nunca só cor);
preservar foco (heading `tabIndex{-1}` + foco programático no retry).

### 2.4 Ownership, versionamento e migração

| Papel | Dono |
| --- | --- |
| Contrato (doc `docs/design/design-foundations.md`), núcleo semântico, state contract, baseline a11y | **System Designer** |
| Mecânica de implementação (alias layers, build, custo, performance) | **Founding Product Engineer** |
| Valores brutos, temas e extensões engine-local | **engine owner** |
| Verificação independente (countersign a11y/regressão) | **QA** |
| Decisão de adoção como política + merges | **CEO/board** |

- **Versionamento**: `vMAJOR.MINOR` no doc do contrato + changelog datado. Breaking
  (remover/renomear token do núcleo, subir severidade de check a11y) = MAJOR com
  janela de deprecação de **2 ciclos de readiness**; MINOR = adição.
- **Deprecação**: nome legado marcado `@deprecated → --ads-*` no CSS da engine; remoção
  só ao fim da janela, verificada por grep-audit do SD (produzidor) **e** QA countersign
  (verificador).

### 2.5 Retrofit incremental (ondas, sem big-bang)

| Onda | Conteúdo | Risco | Custo |
| --- | --- | --- | --- |
| **W0 — correção de defeitos** (pré-requisito, ~3 issues técnicas) | dojoToday: `:focus-visible` em `.btn/.link-btn` + `--muted` escurecido p/ ≥4.5:1; OS: declarar/substituir `var(--text)` do engine-hub.css:60 | baixo (local, sem mudança visual percebida além do fix) | XS |
| **W1 — alias layer** | cada engine ganha `:root` alias `--ads-*` mapeando valores locais existentes; nenhuma regra visual muda | baixo (aditivo) | S |
| **W2 — state contract** nos controles do loop de lição | aplicar state contract (2.3) aos controles primários das superfícies de lição/missão das 3 engines | médio (muda aparência de estados hoje ausentes) | M |
| **W3 — componente do loop** (seção 4) como padrão documentado + `forced-colors` wave 1 | FeedbackPanel/ResultScreen alinhados ao contrato canônico; `@media (forced-colors: active)` nos controles do loop | médio | M |

Cada onda = 1 issue técnica própria, issue aprovada pelo board, implementada pelo FPE
(ou engine owner), countersign QA. Nenhuma onda depende da anterior estar 100% — exceto
W1→W2 (alias precisa existir antes de referenciar).

---

## 3. Proposta — baseline de acessibilidade como política de tier

Mapeia para a estrutura existente de severidades do readiness
(`policy.yaml`: critical/high → **block**; medium/low → **disposition-required**).
Nada aqui cria mecanismo novo: usa `invalidatingChanges: accessibility` já vigente.

### 3.1 Baseline v1 (proposta)

| # | Checagem | Severidade inicial | Tratamento | Justificativa |
| --- | --- | --- | --- | --- |
| B1 | **Foco visível** em 100% dos controles interativos (outline ≥2px + offset ≥2px) | **high** | **block** | dojoToday hoje falharia — correção W0; navegação por teclado é pré-requisito de todo o resto |
| B2 | **Contraste AA 4.5:1** texto normal nos fluxos canônicos (tokens de texto/muted das superfícies de lição) | **high** | **block** | dojoToday `--muted` 3.35:1 hoje falharia — correção W0 |
| B3 | **Feedback não depende só de cor** (cor + borda/ícone/texto) nos estados pass/fail | **high** | **block** | já é prática de facto no literacyDojo (feedback-pass/fail) — formaliza |
| B4 | **`aria-live`/`role=status|alert`** em feedback assíncrono e resultado de tentativa | **medium** | disposition-required → **block** no v2 | OS/literacy praticam; dojoToday tem 1 uso pontual |
| B5 | **`prefers-reduced-motion`** guard global (animação não essencial desligável) | **medium** | disposition-required → **block** no v2 | as 3 já têm guard; formaliza e uniformiza |
| B6 | **Alvo de toque ≥44px** nos controles primários mobile | **medium** | disposition-required | convergência de fato (44/44/48) — vira regra declarada |
| B7 | **`forced-colors`** compatível nos controles do loop (borda/outline sobrevivem a system colors) | **low (v1)** → **medium (v2)** → high (v3) | disposition-required | hoje 0/3 engines; phase-in para não bloquear tudo de uma vez |
| B8 | `.sr-only` disponível e usado para conteúdo apenas-visual significativo | low | disposition-required | 2/3 engines têm |

### 3.2 Phase-in (evita bloquear readiness existente de um dia pro outro)

- **v1 (aprovação board)**: B1–B3 já valem como **block** — mas com **W0 executado
  antes da próxima revalidação** (as 2 falhas conhecidas são do dojoToday; surface
  customer-ready vigente não é afetada: literacy-standalone e os-literacy passam B1–B3
  na amostra auditada).
- **v2 (+1 ciclo de readiness)**: B4/B5 sobem a block; B7 sobe a medium.
- **v3 (+2 ciclos)**: B7 (forced-colors) sobe a high/block. Meta declarada: forced-colors
  deixa de ser o "sempre adiado".

### 3.3 Verificação (countersign — independente, sem auto-declaração)

1. **Produtor (engine)**: inclui as checagens B1–B3 no suite Playwright da engine
   (foco via `:focus-visible` pseudo-class + contraste via extração computada) —
   evidência necessária, nunca suficiente.
2. **QA countersign**: roda verificação independente (scripts próprios, mesma base)
   nos fluxos canônicos por use case; emite veredito GO/NO-GO que o CEO consome no
   countersign de readiness. Falha em check **block** = gap `high` → política existente
   derruba o tier (`blocked`) sem decisão ad hoc.
3. **SD**: auditoria periódica de consistência (grep-audit de tokens/estados) como
   evidência de tendência, **não** como aprovação.

**Métricas de adoção** (para a board acompanhar, sem virar burocracia):
% de controles do loop com state contract completo por engine; nº de tokens do núcleo
mapeados; nº de falhas B1–B3 abertas por ciclo. Sucesso = adoção **e** verificação
independente — nunca auto-avaliação estética.

---

## 4. Esboço — contrato do componente canônico do loop tentativa/feedback/retry

Referência de fato hoje: `literacyDojo` `LessonScreen` + `FeedbackPanel` (o loop mais
completo e auditado). O esboço formaliza para que OS/dojoToday (e engines futuras)
possam aderir sem copiar código.

### 4.1 Anatomia

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

### 4.2 Contrato de estados do loop

| Estado do loop | UI | A11y |
| --- | --- | --- |
| idle | input habilitado, submit disabled até mínimo | — |
| submitting | submit disabled + rótulo/indicador de carga | `aria-busy` no stage |
| feedback:pass | painel success (texto+borda+cor), próxima ação inequívoca | live polite; foco permanece |
| feedback:fail | painel error + CheckList específico + score opcional | live polite; checks em texto |
| retry | input limpo, dicas preservadas, foco volta à instrução | foco programático na instrução |
| hint | dica nova anexada numerada | live polite |
| erro de sistema | painel `role="alert"` + ação de recuperação | never silencioso |

### 4.3 Critérios de aceite (QA-verificáveis)

1. Um aprendiz consegue: tentar → ler feedback específico por check → pedir dica →
   retentar → perceber progresso (micro-lesson-contract §aceite 3).
2. Todo controle do loop cumpre o state contract (2.3) — verificável por teclado.
3. Feedback é anunciado a leitores de tela (live region) e compreensível sem cor
   (B3) e em forced-colors após W3 (B7).
4. `data-testid` estáveis para os 5 papéis de ação (`submit-attempt`,
   `retry-activity`, `hint-button`, `next-activity`, `feedback-panel` — nomes já
   usados no literacyDojo; padronizados para reuso de specs E2E entre engines).
5. Nenhum estado do loop marca `mastered`; progresso de experiência no máximo
   `completed` (boundary do micro-lesson-contract — inegociável).

---

## 5. O que a board está aprovando (decisão)

1. **Adotar** o token/state contract mínimo (§2) como fundação oficial — com ownership
   e versionamento como especificado.
2. **Adotar** a baseline a11y v1 (§3.1) com o phase-in v1→v3 (§3.2), integrada ao
   countersign de readiness pelas severidades existentes da policy.
3. **Emitir** as issues W0 (3 correções de defeito comprovado) para implementação
   imediata — W1+ seguem como child issues priorizadas após W0.

Ao aceitar: SD cria as issues W0 (blockers nomeados por engine), FPE/engine owners
implementam, QA countersigna; recusa ou ajustes: board indica quais seções voltam.

## 6. Riscos e trade-offs declarados

- **Risco**: alias layer virar custo sem uso (W1 adotado, W2 nunca). Mitigação: W2 é o
  critério de sucesso de W1; sem adoção em 2 ciclos, a camada é removida (deprecação
  funciona nos dois sentidos).
- **Trade-off**: manter accents e `--ads-radius` com valores engine-local preserva
  identidade das engines, mas adia uniformidade visual total — deliberado (missão:
  consistência sem apagar bounded contexts).
- **Trade-off**: phase-in de forced-colors (low→high em 2 ciclos) evita bloquear
  readiness hoje, mas formaliza que o gap existe por mais ~2 ciclos — explícito, com
  data, e não invisível como hoje.
