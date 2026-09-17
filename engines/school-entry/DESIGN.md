# School entry — implementation design

User delegated technical and visual decisions after approving recommendations. Reference: docs/entry-concept.png (generated concept); this is an implementation-selected reference, not a separately user-approved screenshot.

## Tokens and arrangement
White #ffffff page, ink #162333, muted #586779, teal #137d78, border #d5dee5. System sans-serif; desktop heading 60px/1.12, body 18px/1.6, controls 16px semibold, labels 15px. Content max-width 1120px, 24px mobile gutters, header 60px, generous vertical spacing. No decorative imagery or badges. Cards have 4px teal top rule, 8px radius, 24px padding. Desktop results are 3 columns; mobile 1. Header brand is a text link with teal AI. All controls are native HTML.

## ENTRY
Header AI DevSchool and Administração. Heading Por onde você quer começar? Subtitle Conte seu objetivo. Encontre uma experiência para colocar em prática. Field label O que você quer aprender ou fazer? Helper Não inclua dados pessoais ou informações confidenciais. Primary button Encontrar meu caminho. Results Caminhos para você, supporting Escolha a experiência que mais combina com seu momento. Each card: name, description, reason labelled Por que pode combinar com você, Começar. Footer Cada experiência mantém seu próprio progresso.

The concept contains fixture results, not current production availability. Actual results and reasons come from the live flow. Correct the concept's unsupported miniTown claim: exploration is not an assessed practical lesson. Initial screen has no fabricated recommendations; available catalog appears after an explicit catalog action, or fallback. Add Ver experiências disponíveis as a required manual access action, not a decorative feature.

## STATES
Loading uses an aria-live status and disables submit; text and last results remain visible until replaced. No-match: Nenhuma experiência disponível combina bem com esse pedido. Veja outras opções disponíveis. TypeSafe failure: Não foi possível personalizar agora. Estas experiências estão disponíveis. Empty: Nenhuma experiência disponível no momento. Tente novamente mais tarde. Configuration error is an error, not an empty catalog. Launch failure stays on page with message. All states use existing content region, not extra screens.

## ADMIN
Same header and typography; heading Engines disponíveis, short explanation Libere experiências para todos os alunos. A checagem automática confirma se a entrada está utilizável. Login: Acesso do operador, Senha, Entrar. After auth show Sair and a vertical table-like list of 13 entries; each row name, description, configured-target state, manual toggle and save/error status. Health values are distinct from enabled flag. Mobile rows stack. No delete action, no fake statistics. Loading, failed save and unauthorized states have explicit feedback. Toggle save confirmed before authoritative state changes.

## Scope of visual proof
Browser tests cover copy, order, controls, result counts, responsive overflow, keyboard forms and state transitions. A reference comparison checks layout, white background, typography, teal, cards and spacing. No screenshot is shipped as UI.
