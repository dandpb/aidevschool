# Plan: copy student-facing nas 2 URLs de lançamento

Change-id: AID-6107-launch-copy-student-facing · From: intent/AID-6107-launch-copy-student-facing/intent.md · Status: approved

> Aceite: plano pai A/6005 rev `a66c5aed` confirmado pelo founder (`d44e75f3`,
> Opção A, 2026-11-01T10:28:05Z) — seção 5 define exatamente este trabalho;
> child AID-6107 despachada pelo CEO (recibo AID-6005 09:45:06Z, admissão
> verificada). Especificação de copy abaixo deriva do escopo da issue.

## Especificação de copy (pt-BR, benefício do aluno primeiro, marcas congeladas)

### `engines/codexdojo-os-prototype/index.html`

| Campo | De | Para |
| --- | --- | --- |
| `<title>` | `codexDojo OS` | `codexDojo OS — aprenda IA em microlições de 3 a 5 minutos` |
| meta description | `Protótipo do codexDojo OS — aprenda computação dentro de um desktop Linux.` | `Escolha sua trilha e aprenda IA em microlições de 3 a 5 minutos: comece com um clique, sem conta — e volte amanhã para manter o ritmo.` |
| `og:title` | `codexDojo OS` | igual ao `<title>` |
| `og:description` | (igual à meta antiga) | igual à meta nova |
| `og:image:alt` | `codexDojo OS — desktop de aprendizado` | `codexDojo OS — microlições de IA, uma por dia no seu ritmo` |
| ld+json WebSite `description` | (igual à meta antiga) | igual à meta nova |

Motivo: remove o enquadramento "Protótipo" da URL de lançamento; troca
"aprenda computação dentro de um desktop Linux" (fala de engine) pelo
benefício do aluno (duração 3–5 min, 1 clique, sem conta, ritmo diário =
motivo para voltar). Nome "codexDojo OS" preservado (congelamento +
`tests/os.smoke.spec.ts:10` regex `/codexDojo OS/`).

### `engines/literacyDojo/index.html`

| Campo | De | Para |
| --- | --- | --- |
| `<title>` | `LiteracyDojo — IA com confiança no trabalho` | `LiteracyDojo — IA com confiança no trabalho, 5 minutos por dia` |
| meta description | `LiteracyDojo — aprenda a usar IA com confiança no trabalho, cinco minutos por dia.` | `Aprenda a usar IA com confiança no trabalho em microlições de cinco minutos: uma por dia, a um clique, sem conta — e seu progresso fica neste navegador.` |
| `og:title` | `LiteracyDojo — IA com confiança no trabalho` | igual ao `<title>` |
| `og:description` | (igual à meta antiga) | igual à meta nova |
| `og:image:alt` | `AiDevSchool · LiteracyDojo — cinco minutos por dia` | (mantido — já aluno-centrado) |
| ld+json WebSite `description` | (igual à meta antiga) | igual à meta nova |

Motivo: title ganha a promessa de duração (padrão cadência); description
acrescenta 1-clique, sem conta e progresso local (motivo para voltar +
fricção zero), mantendo o benefício existente. Factual: sem conta e
progresso no navegador são propriedades reais do app (`OnboardingScreen`
privacy-note; `AGENTS.md` do engine).

Headers de landing/onboarding in-app: auditados conformes (intent.md) — sem
mudança neste PR.

## Files that change

1. `engines/codexdojo-os-prototype/index.html`
2. `engines/literacyDojo/index.html`
3. `intent/AID-6107-launch-copy-student-facing/intent.md` (new)
4. `intent/AID-6107-launch-copy-student-facing/plan.md` (new)
5. `intent/AID-6107-launch-copy-student-facing/REVIEW.md` (new — passes do diff)

Sem mudanças em testes (nenhum teste pinaria as strings antigas além do regex
`/codexDojo OS/`, que continua casando — verificado por grep em
`tests/`/`src/` de ambos os engines).

## Order of work

1. Auditoria (feita, intent.md) → 2. Editar os 2 `index.html` →
3. Prova canônica por engine (abaixo) → 4. REVIEW.md passes →
5. Commit/push branch `aid6107/launch-copy-student-facing`, 1 PR (base main)
   com trailer `Provenance:` no body → 6. Countersign via porta
   `scripts/countersign_assign.sh` → assignee System Designer (`bb7b8143`) →
   7. Merge: CEO pela porta única (`scripts/merge_pr.sh`) — não este produtor.

## Risks

- Copy nova afirmar algo que o app não cumpre → mitigado: benefícios citados
  (duração por missão `estimatedMinutes`, 1 clique no CTA do hub, sem conta,
  ritmo diário/streak) são propriedades existentes, verificáveis nos fontes.
- ld+json/OG desincronizados de meta → espec especifica espelhar; grep
  pós-edit confere.
- Colisão com lanes #744/#761/AID-6030 → diff restrito aos 2 `index.html` +
  `intent/AID-6107-*`; nenhum path das lanes abertas tocado.
- CI: `countersign-gate` vermelho até a citação (fail-closed esperado);
  demais checks devem verdes.

## Proof

- `cd engines/codexdojo-os-prototype && npm run lint && npm run test && npm run build`
- `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build`
- `grep -c "3 a 5 minutos" engines/codexdojo-os-prototype/index.html` → 3
  (title/og/ld+json não — title conta 1, meta 1, og 1, ld+json 1 → conferir
  consistência por grep de cada campo)
- Build local serve os HTML com o title novo (validação no build/preview);
  title do OS continua casando `/codexDojo OS/` (smoke intocado).

## Verification split

Produtor: Curriculum Content Engineer (`93e26ea9`) — este diff.
Countersign pré-merge: System Designer (`bb7b8143`), distinto do produtor
(AID-2768 §5), via `scripts/countersign_assign.sh`.
Merge: CEO (single-writer, porta única, diretiva founder 725fe216).
