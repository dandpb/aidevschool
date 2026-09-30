---
version: alpha
name: school-entry — SDLCQuest entry
description: No-login school entry reusing the SDLCQuest v1.3 identity 1:1 (no new visual system). Paper background, deep map panel with Canvas islands (mint/gold), mint primary actions, gold journal accent, 18/10/9px radii, 3px #12624c focus ring.
colors:
  primary: "#a7e6cd"
  paper: "#f5f3ec"
  card: "#fffef9"
  ink: "#172935"
  muted: "#4c6057"
  line: "#d9ded5"
  deep: "#101d28"
  mint: "#a7e6cd"
  mint-dark: "#195d4b"
  gold: "#e8c888"
  coral: "#b64c36"
  primary-border: "#86bfa7"
  primary-text: "#163b2d"
  focus: "#12624c"
typography:
  body:
    fontFamily: "'Avenir Next','Segoe UI',Arial,sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
  eyebrow:
    fontFamily: "'SFMono-Regular',Consolas,'Liberation Mono',monospace"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 1.25px
rounded:
  panel: 18px
  card: 10px
  control: 9px
---

# School entry — implementation design

User delegated technical and visual decisions after approving recommendations. Reference: docs/entry-concept.png (generated concept); this is an implementation-selected reference, not a separately user-approved screenshot.

## Tokens and arrangement (AID-3484, 2026-09-30)

The entry surface reuses the SDLCQuest v1.3 identity 1:1 — no new visual system. Tokens: paper #f5f3ec, card #fffef9, ink #172935, muted #4c6057, line #d9ded5, deep #101d28, mint #a7e6cd, mint-dark #195d4b, gold #e8c888, coral #b64c36; radii 18/10/9px; focus 3px #12624c offset 3px; sans 'Avenir Next','Segoe UI',Arial; mono SFMono-Regular/Consolas. Georgia italic only on the heading `<em>`. Source of record: `engines/sdlc-quest/src/style.css` via the AID-3458 fatia-1 token contract (`_work-products/AID-3458/fatia1/01-tokens-e-identidade.md`, branch `aid3458/wp-fatia1`, PR #614 @ 7c72a4a1). Visual acceptance is limited (edbd785f); live accessibility/mobile validation belongs to QA (AID-3459, RC-5).

## ENTRY

Header AiDevSchool brand + Como funciona + Administração. Heading Uma escola. Duas jornadas. Subtitle states the shared fundamentals and the two audiences. A school map is drawn in Canvas 2D (paper/mint/gold islands, no external assets) with a textual alternative (map-alt), a pause control, and reduced-motion honored (starts paused when the OS requests it). The map animation keeps exactly one scheduled RAF chain: draw() renders one frame, frame() reschedules, resize schedules a single frame (or draws synchronously when paused) and pausing cancels the handle — a resize can never multiply the loop (test E7). The mission panel (ETAPA ATUAL · FUNDAMENTOS) renders from GET /api/entry: fundamentals = literacyDojo engine, adaptive track (onboarding + Mapa Inicial l02; order adapts — guided l01→l03… / intermediate l03…; no fixed l01–l14 sequence, no lesson count in the copy), CTA Começar pelos fundamentos. The static F1–F4 trail (Entender IA → Uso seguro → Prompt e contexto → Verificação) carries no local progress and no lock states — school-entry never reads or writes learner progress. Static copy never affirms availability: the fundamentals island reads "disponibilidade confirmada no lançamento" and the practice summary says "Ver jogos e desafios" — status is only stated after the operator+health launch gate answers (FSE review 2026-09-30, findings 2–3).

Two journey cards from the same contract: IA no cotidiano (não programa) and IA para Dev (PRÉVIA PLANEJADA) with the dev-bridge disclosure (mod-05 lessons l15, l16–l17, l21–l23, l27–l29, titles from curriculum/ai-literacy/catalog.yaml) framed as a planned destination — the standalone app serves only the ia_pratica journey today (PUBLIC_JOURNEY filter, verified first-hand), so the copy must never claim the bridge is served by the app. Both CTAs launch the same verified entrypoint through POST /api/launch/literacyDojo (operator release + Chromium recheck intact); 409 shows "Os fundamentos não estão disponíveis agora" and stays on page. game-02-warehouse is not an entry door (optional laboratory, CEO directive). Honest-copy rules (test-enforced, E3/R6): the "não sincroniza" disclaimer must be present; affirmative sync claims and "continuar de onde parou" are forbidden; adaptive-journey copy ("avaliação", "se adapta") is required and fixed-sequence claims (l01–l14, lesson counts, "sequência curada") are forbidden.

Returning learners: section Já conhece a escola? keeps the recommender (Field label O que você quer aprender ou fazer? Helper Não inclua dados pessoais ou informações confidenciais. Primary button Encontrar meu caminho. Results Caminhos para você; each card name, description, reason, Começar. Manual action Ver experiências disponíveis). Footer: a entrada apenas recomenda — cada experiência mantém seu próprio progresso.

The concept contains fixture results, not current production availability. Actual results and reasons come from the live flow. Initial screen has no fabricated recommendations; available catalog appears after an explicit catalog action, or fallback. Ver experiências disponíveis remains a required manual access action, not a decorative feature.

## STATES
Loading uses an aria-live status and disables submit; text and last results remain visible until replaced. No-match: Nenhuma experiência disponível combina bem com esse pedido. Veja outras opções disponíveis. TypeSafe failure: Não foi possível personalizar agora. Estas experiências estão disponíveis. Empty: Nenhuma experiência disponível no momento. Tente novamente mais tarde. Configuration error is an error, not an empty catalog. Launch failure stays on page with message. All states use existing content regions, not extra screens. Entry-contract load failure shows a reload hint in the mission panel.

## ADMIN
Same header and typography; heading Engines disponíveis, short explanation Libere experiências para todos os alunos. A checagem automática confirma se a entrada está utilizável. Login: Acesso do operador, Senha, Entrar. After auth show Sair and a vertical table-like list of 13 entries; each row name, description, configured-target state, manual toggle and save/error status. Health values are distinct from enabled flag. Mobile rows stack. No delete action, no fake statistics. Loading, failed save and unauthorized states have explicit feedback. Toggle save confirmed before authoritative state changes.

## Scope of visual proof
Browser tests cover copy, order, controls, result counts, responsive overflow (390/1440), keyboard forms, state transitions, and the entry contract (E1–E7: destinations, launch, honest copy, unreleased feedback, single-RAF-loop regression; E6 — real literacyDojo app end to end — is opt-in via LITERACY_REAL_BASE_URL, with the CI build-cost blocker documented in the engine README §Verificar). No screenshot is shipped as UI; live visual/accessibility verdict is QA AID-3459 (RC-5).
