# Fundações de Design AiDevSchool — contrato de tokens, estados e componente do loop

**Versão:** v1.0 (2026-09-09) · **Fonte canônica:** proposta AID-914 (doc `proposal`,
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

**Wave 1 do B7 (W3, esta onda):** nos controles/containers do loop das 3 engines,
`@media (forced-colors: active)` garante que borda e outline **sobrevivem** a system
colors e que a distinção pass/fail/inválido exista **sem cor** (largura/estilo de
borda: fail e inválido = dashed; pass e selecionado = solid ≥3px). Preferimos
geometria + system colors a `forced-color-adjust: none` (não quebramos temas de alto
contraste do usuário).

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
| W3 | Este doc (padrão documentado) + adesão §4 FeedbackPanel/ResultScreen + forced-colors wave 1 (B7) | PR AID-1096 (este change) |

**Métricas de adoção** (acompanhamento da board): % de controles do loop com state
contract completo por engine; nº de tokens do núcleo mapeados (hoje: 5/18 — mínima);
nº de falhas B1–B3 abertas por ciclo. Sucesso = adoção **e** verificação independente.
