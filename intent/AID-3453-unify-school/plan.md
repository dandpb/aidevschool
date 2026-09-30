# Plan: onda 1 — matriz, contrato de release e fatia vertical 1

Change-id: `AID-3453-unify-school` · From: intent/AID-3453-unify-school/spec.md · Status: draft r1.1 (corrigido por revisão independente do PR #610, comentários AID-3453 2026-09-30T12:11Z)

## Files that change

- `intent/AID-3453-unify-school/{intent,spec,plan,curriculum-matrix}.md` — esta
  onda (r1.1: P1 bindings, P1 ZAI 9/27, P2 primary+supporting, P2 migração
  não destrutiva, P2 tarefa inédita + rubrica de transferência).
- Fatia 1 (PR próprio, frente CPE — **AID-3457 "Mapear currículo e progresso
  compartilhados"**, já atribuída e in_progress; integração aguarda este
  plano corrigido + compatibilidade):
  - `curriculum/ai-literacy/catalog.yaml` — campo `competency:` por lição,
    com `primary` + `supporting[]` (R1).
  - `engines/codexdojo-os-prototype/config/mission-bindings.yaml` —
    **estados de missão explícitos** (`bound`≠`visible`≠`guided`≠`readiness`,
    spec R8) + campo `competency` opcional. **Correção r1.1: NÃO incluir
    "bindings l25–l32" — todas as 32 lições já estão bound** (39 bindings:
    23 ai-pratica + 16 dev). Binding novo só para os gaps reais
    (voxel game-04, game-10–18; dev não-voxel) e **somente após decisão CCE
    r2** sobre escopo.
  - `learner/substrate/mission_catalog*.py` — propagar campos se o read model
    consumir (sem quebrar schema v1; teste novo).
  - `engines/codexDojo/ecosystem/MANIFEST.md` — se contrato produto-facing muda.

## Ordem de trabalho

1. **Onda 1 (este change)**: matriz r1.1 + contrato de release + plano de
   fatia → PR #610 (draft; revisão independente já incorporada; sem merge).
2. **Frente CCE** (AID-3456): ratificar item a item a matriz r1.1 (P/S por
   unidade, overlaps MVP/ZAI, "6 gates", decisão sobre bindings dos 10 jogos
   voxel + dev não-voxel) → matriz r2 decidida.
3. **Frente CPE** (AID-3457, in_progress): fatia vertical 1 — campo
   competency P/S + estados de missão + regeneração de views. Fusões de
   conteúdo dependem da r2 da CCE e das hard constraints R8/R9 (ZAI seed
   proibido em bancos existentes; fixtures antes/depois).
4. **Frente UX** (AID-3458): identidade SDLCQuest v1.3 na entrada da escola.
5. **Frente QA** (AID-3459): veredito independente por fatia — RC-4 inclui
   tarefa inédita + rubrica de transferência por público (R10); RC-5
   acessibilidade + retomada; RC-6 countersign.

## Riscos

- **Maior risco:** campo/estado novo em catalog.yaml/mission-bindings quebrar
  consumidores do read model → mitigação: campos opcionais + regeneração +
  suítes literacyDojo (`gen:content`, lint, test, build, e2e) e substrate
  antes de pedir review.
- **ZAI seed é destrutivo** (`prisma/seed.ts:12–14` `deleteMany`) — proibido
  em bancos existentes; qualquer trabalho ZAI segue R9 (IDs/slugs estáveis,
  upsert idempotente, recuperação, fixtures antes/depois com
  `completed`/`in_progress`, sem promoção a mastered).
- Fusão ZAI↔literacy mexer em tests/e2e alheios → só gradual, por módulo,
  com prova de dependências (fora da fatia 1).
- Matriz virar "documento morto" → r2 decidida pela CCE é condição de release
  (RC-1); sem isso, nada funde.
- Rubricas de transferência/tarefas inéditas não existem para nenhuma
  competência → RC-4 bloqueia release até a CCE autorar e a QA verificar.
- Alternativas NÃO escolhidas: (a) mover filtro `ia_pratica` para o
  compilador (vetado pela issue); (b) reescrever `curriculum-data.ts` do ZAI
  de uma vez (risco alto); (c) criar engine novo "escola" (viola one
  learner/many engines); (d) contar fonte TS por grep (vetado — parse
  estrutural por SHA, lição r1.1).

## Proof

- Onda 1 (docs): PR #610 + contagens re-executáveis da matriz (§1 da matrix),
  corrigidas r1.1 (PyYAML `len(bindings)`=39; eval Node ZAI = 9 módulos/27
  lições).
- Fatia 1 (CPE, critério de pronto):
  - `python3 -m learner.substrate` → valida, views regeneradas sem erro
    (bindings existentes 39 preservados; nenhum binding novo sem decisão r2).
  - `python3 -m pytest learner/substrate/tests -q` → verde (inclui teste
    novo dos campos `competency` P/S e estados de missão).
  - `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build` → verde.
  - Validate do YAML canônico de `curriculum/ai-literacy/` → válido com
    campos novos.
  - Se tocar ZAI (não esperado na fatia 1): prova R9 — fixture com estado
    `completed`/`in_progress` sobrevive ao update; seed executado apenas em
    banco efêmero.

## Verification split

Produtor: CPE (fatia 1, AID-3457) em PR draft próprio. Verificador: frente
QA (AID-3459, fresh-context) checa diff vs. spec R1–R10 + este plano +
RC-1..RC-6 (RC-4 inclui R10: tarefa inédita + rubrica por público) e emite
veredito; countersign distinto é pré-condição de qualquer merge futuro
(`scripts/merge_pr.sh` — não executado nesta onda).
