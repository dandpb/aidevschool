# REVIEW — AID-6107-launch-copy-student-facing

Producer: Curriculum Content Engineer (`93e26ea9`) · Data: 2026-11-02 ·
Base: `afda529c` (main) · Passes segundo raiz `REVIEW.md`.

## 1. Correctness vs plan

Diff = exatamente os arquivos listados em `plan.md` §Files that change:
2 `index.html` + 3 artifacts em `intent/AID-6107-launch-copy-student-facing/`.
Tabela de copy do plan aplicada 1:1 (title/meta/OG/ld+json do OS; title/meta/
OG/ld+json do LiteracyDojo; `og:image:alt` do OS; literacy `og:image:alt`
mantido conforme espec). Desvios: nenhum.

## 2. Tests & evidence

- `cd engines/literacyDojo && npm run gen:content` → `OK: 35 lição(ões)…
  23 IA na Prática, 12 Dev`; read model regenerado.
- `cd engines/literacyDojo && npm run lint` → `Checked 141 files. No fixes
  applied` ✓; `npm run test` → **392 passed | 1 skipped (54 files)** ✓;
  `npm run build` → `✓ built in 1.37s` ✓.
- `cd engines/codexdojo-os-prototype && npm run lint` → `Checked 192 files`
  ✓ (6 warnings pré-existentes); `npm run test` → **466 passed (75 files)** ✓;
  `npm run build` → ✓; `dist/index.html` serve o title novo
  (`<title>codexDojo OS — aprenda IA em microlições de 3 a 5 minutos</title>`)
  e 5× a string nova — validação no build local conforme aceite.
- ld+json de ambos os `index.html` continua JSON válido (node JSON.parse) ✓.
- `npm run test:smoke` (OS) **não executado localmente**: o webServer do
  config exige 6 engines irmãs com deps instaladas (falhou no boot do
  miniTown, `ERR_MODULE_NOT_FOUND` — limitação do checkout, não do diff).
  Cobertura: CI roda o suite; a única asserção de title
  (`tests/os.smoke.spec.ts:10` `/codexDojo OS/`) continua casando por
  construção (title novo começa com `codexDojo OS`).

## 3. Conventions

- Nenhuma edição em paths gerados (`src/data/generated/`, `.mavis/`),
  `curriculum/`, `learner/`, `docs/product-readiness/`, hub/Engine Hub,
  beta-guide, inventory/VISION/README — grep do diff confirma só 2
  `index.html` + `intent/AID-6107-*/`.
- Nomes/URLs congelados: nenhuma marca renomeada, nenhum redirect/canonical/
  og:url alterado; nenhum engine/jogo/URL novo (congelamento do plano A).
- Nenhum teste editado (nenhum pinava as strings antigas — verificado por
  grep `Protótipo do codexDojo OS|LiteracyDojo — aprenda` nos 2 engines).
- Copy pt-BR aluno-centrado; sem claims de readiness/prontidão; sem
  promessa de domínio/mastered; sem PII.

## 4. Security & hygiene

- Sem credenciais/tokens; strings estáticas de marketing apenas.
- Benefícios citados são propriedades existentes do produto: minutos por
  missão (`Hub.tsx` `estimatedMinutes`), 1-clique (CTA do hub), sem conta
  (Onboarding lead), ritmo diário (meta/streak locais) — copy não promete
  o que o app não entrega.
- Pass `/simplify`: n/a (sem lógica nova; strings apenas).

## Achados

- **Nit**: description do OS usa "microlições" com acento e o title idem —
  consistente entre si; literacy usa "microlições"/"cinco minutos" por
  extenso no description e "5 minutos" no title (paridade com o title
  antigo que já usava dígitos em nenhum lugar — aceito por legibilidade de
  tab). Sem ação.
- **Important (registro)**: OG image (`og.jpg`/`og.png`) continua com arte
  antiga que pode conter o title antigo — re-gerar imagem é trabalho de
  design fora do congelamento de copy deste PR; enfileirar se o founder
  quiser (não bloqueia: alt-text novo já descreve o benefício).

## Veredito (advisory, produtor)

CONFORME ao plan; provas canônicas verdes nos 2 engines (limitação do
smoke local registrada acima, coberta por CI). Producer ≠ verifier:
countersign pré-merge do System Designer (`bb7b8143`) pendente pela porta
`scripts/countersign_assign.sh`.
