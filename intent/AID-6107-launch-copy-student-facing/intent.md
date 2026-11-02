# Intent: copy student-facing nas 2 URLs de lançamento (codexDojo OS + LiteracyDojo)

Author: CEO (child AID-6107 do plano A/6005) · Change-id: AID-6107-launch-copy-student-facing · Status: accepted

> Origem autoritativa: issue Paperclip **AID-6107** (parent AID-6005), criada
> pelo CEO sob o plano `plan` rev `a66c5aed` **confirmado pelo founder**
> 2026-11-01T10:28:05Z (`d44e75f3`, Opção A — lançamento com codexDojo OS +
> LiteracyDojo como únicas URLs públicas). Seção 5 do plano atribui a revisão
> de títulos/copy das 2 URLs via issues filhas; esta é a child. Aceite do
> plano = aceite do founder acima + despacho CEO (recibo AID-6005 09:45:06Z).

## Problem (auditoria first-hand, main `afda529c`)

Regra 3 do gate de publicação do plano A: "título/copy para aluno" — nenhum
título/copy de URL pública voltado à marca da engine em vez do benefício do
aluno (microlições de 3–5 min, 1 clique, motivo para voltar).

Achados na superfície de entrada (`<title>`, meta description, OG, ld+json):

| Superfície | Hoje | Veredito regra 3 |
| --- | --- | --- |
| `engines/codexdojo-os-prototype/index.html` `<title>` | `codexDojo OS` | **FAIL** — só marca, zero benefício |
| idem, meta/OG/ld+json description | `Protótipo do codexDojo OS — aprenda computação dentro de um desktop Linux.` | **FAIL** — "Protótipo" enquadra a URL de lançamento como teste; "aprenda computação" é fala de engine, sem duração/1-clique/retorno |
| `engines/literacyDojo/index.html` title/description | `LiteracyDojo — IA com confiança no trabalho` / `…aprenda a usar IA com confiança no trabalho, cinco minutos por dia.` | **PASS parcial** — benefício e duração presentes; falta o 1-clique/sem-conta e o motivo para voltar no description |

Headers de landing/onboarding in-app auditados e **conformes** (sem mudança):
OS Onboarding h1 "O que você quer conseguir fazer com IA?" + lead "Leva menos
de um minuto… Sem conta" (`src/journey/Onboarding.tsx:40-42`); OS Hub h1
"Aprenda uma coisa útil agora." + missão com minutos (`src/journey/Hub.tsx:132-135`);
LiteracyDojo Onboarding/boas-vindas e Home h1 (`src/screens/OnboardingScreen.tsx`,
`src/screens/HomeScreen.tsx:76-77`).

## Proposed outcome

Aluno que vê o link/tab/preview de qualquer uma das 2 URLs de lançamento lê,
em pt-BR, o benefício para si: microlições curtas (3–5 min), começar com um
clique, sem conta, e motivo para voltar (ritmo diário) — mantendo nomes/URLs
congelados (nenhum rename, nenhuma URL nova).

## Affected users and systems

- `engines/codexdojo-os-prototype/index.html` (entrada principal, 2 públicos)
- `engines/literacyDojo/index.html` (entrada avulsa IA na Prática)
- Fora de escopo (colisão com lanes abertas): `docs/product-readiness/`,
  hub/Engine Hub (#761/AID-6027), `beta-guide` (AID-6030),
  inventory/VISION/README (AID-6008/#760), conteúdo canônico
  `curriculum/ai-literacy/` (lições inalteradas).

## Constraints

- Congelamento do plano A: nenhum engine/jogo/URL novo; nomes de marca
  permanecem (title do OS continua casando `/codexDojo OS/` exigido por
  `tests/os.smoke.spec.ts:10`).
- Copy em pt-BR; sem claims de prontidão/readiness (cadeia #744/AID-6050);
  sem promessa de "mastered"/domínio; sem PII.
- 1 PR único para os 2 engines; validação pelos comandos canônicos
  (lint/test/build por engine); countersign pré-merge System Designer
  (`bb7b8143`) via `scripts/countersign_assign.sh`; merge pela porta única
  `scripts/merge_pr.sh` (writer CEO, diretiva founder 725fe216).
