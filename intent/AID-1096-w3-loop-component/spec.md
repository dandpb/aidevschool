# Spec: W3 — loop component como padrão + forced-colors wave 1

Change-id: AID-1096-w3-loop-component · Status: approved (ordem AID-1096/CEO; spec canônica = proposal AID-914 rev `70649549` §2.5/§3/§4)

## Conformance audit first-hand @ `14121556` (o que W2 realmente embarcou)

`grep -rn -- "--ads-" engines/ | grep -v node_modules`:
- `--ads-focus`: dojoToday `src/styles.css:37`, literacyDojo `src/styles.css:848`,
  OS `foundation.css:38` (consumido em outlines das 3 engines).
- `--ads-success-text/bg` + `--ads-error-text/bg`: dojoToday `:38-41`,
  literacyDojo `:849-852`. OS: nenhum par (feedback containers do OS usam cores
  locais — aceitável nesta onda; registrado no doc).
- **Alias completa de 18 tokens = deferral registrado** (W2 embarcou só a mínima).

Matriz §4.3 antes do W3:
| Papel/Check | literacy | OS | dojoToday |
| --- | --- | --- | --- |
| testids 5 papéis (§4.3-4) | 5/5 | 0/5 aplicáveis | 0/3 aplicáveis |
| aria-live/atomic no feedback | ✓ FeedbackPanel | ✓ result-verification | ✓ #soc-reply |
| role=alert erro de sistema | n/a (sem erro de sistema no loop) | ✓ save failed | fallback determinístico (nunca silencioso) |
| aria-invalid em checks falhos | só PromptBuilder | n/a | n/a |
| foco preservado no retry | ✓ (W2, testado) | ✓ (W2) | n/a (re-submit) |
| forced-colors (B7) | ✗ | ✗ | ✗ |

## Requisitos

R1 **Doc** `docs/design/design-foundations.md` v1.0: núcleo semântico 18 tokens
(tabela + política de alias mínima vigente), state contract §2.3 normativo,
contrato do loop §4.1–4.3 integral, baseline B1–B8 com phase-in, ownership §2.4,
versionamento, changelog de ondas (W0–W3) e matriz de conformidade por engine
(incl. mapeamento de papéis: OS expõe `feedback-panel`/`retry-activity`;
dojoToday expõe `feedback-panel`/`submit-attempt`).

R2 **literacyDojo**: `aria-invalid` nos inputs de escolha marcados por checks
falhos (ChoiceView); forced-colors wave 1 (containers de feedback com distinção
não-color: fail=dashed, pass=solid 3px; opções inválidas/selecionadas mantêm
borda distinguível).

R3 **OS**: testids canônicos nos papéis do loop do ResultScreen
(`feedback-panel` na região de verificação, `retry-activity` nos botões de
recuperação); forced-colors wave 1 (result-verification ganha borda sob system
colors; controles do loop mantêm borda/outline).

R4 **dojoToday**: testids canônicos no loop do Sócrates (`feedback-panel` em
#soc-reply, `submit-attempt` em #soc-send); forced-colors wave 1 (is-error com
borda dashed distinguível; outline de foco sobrevive).

R5 **Testes por engine** (evidência de produtor, mutação-conferida onde barato):
component/playwright cobrindo aria-invalid, testids e computed styles sob
emulação `forced-colors: active`.

R6 **Readiness**: re-grant v39 embarcado no PR (lição D1/AID-1093): producer
reports frescos no head, bundle de observações com screenshots (incl. capturas
sob forced-colors), assessment v39 `pass customer-ready` para os 6 use cases
tocados, `render`/`check`/`enforce`/pytest verdes no head.

## Decisão de alias (§6, exigida pela ordem)

**Manter a alias mínima** (`--ads-focus` + `--ads-success/error-*` onde há
container de feedback). Rationale: nenhuma onda consumidora dos 13 tokens
restantes existe ou está agendada; W2 consumiu exatamente a mínima; W3 não cria
novos consumidores (forced-colors usa system colors). Critério de remoção §6
segue vigente e auditável no changelog do doc. Extensão fica como decisão da
primeira onda que consumir o núcleo (pós-W3, board).

## Flagged concerns

- `forced-color-adjust: none` deliberadamente **não** usado em wave 1: preferimos
  system colors + geometria (largura/estilo de borda) para distinção — menos
  risco de quebrar temas de alto contraste do usuário.
- Screenshots sob forced-colors: Playwright `forcedColors: 'active'` — evidência
  QA-verificável do B7 wave 1.
