# Spec: Escola única por competências

Change-id: `AID-3453-unify-school` · From: intent/AID-3453-unify-school/intent.md · Status: draft

## Requirements

1. **R1 — Framework de competências único.** Toda unidade curricular de IA do
   repo mapeia para exatamente uma competência da escola única. Competências
   têm IDs estáveis (`F*` fundamentos, `D*` dev) e público-alvo
   (`cotidiano` | `dev` | `ambos`).
2. **R2 — Duas jornadas sobre fundamentos compartilhados.**
   - Jornada **IA no cotidiano**: F1 entender IA → F2 uso seguro →
     F3 prompt/contexto → F4 verificação.
   - Jornada **IA para Dev**: D1 fundamentos/harness → D2 intenção/spec/plano
     → D3 construção → D4 teste/debug/review/manutenção → D5 produto
     IA/evals → D6 agentes/tools/skills → D7 capstone escolhido.
   - Jogos são prática opcional: nenhuma competência exige jogo como
     pré-requisito; jogos podem ser prática recomendada.
3. **R3 — Matriz curricular rastreável** (`curriculum-matrix.md`, junto a
   este change-id): cada fonte existente recebe decisão
   `manter|fundir|melhorar|adiar|remover` + linha de rastreabilidade
   (arquivo:linha ou comando de contagem). Nenhuma remoção é executada nesta
   onda; `remover` é proposta com dono e prova de dependências pendente.
4. **R4 — IDs e progresso preservados.** Nenhum ID de lição/conceito/missão
   muda; fusões são por camada de competência + binding, não por rewrite de
   fontes. Estado de learner (`learner/`) não é tocado; nada é promovido a
   `mastered`.
5. **R5 — Contrato de release pedagógico** (§ abaixo) separado de board/R2;
   gate AID-1222 e piloto AID-641/909 intocados.
6. **R6 — Seam de unificação reusado, não duplicado.** Integração usa
   `engines/codexdojo-os-prototype/config/mission-bindings.yaml`,
   `learner/substrate/mission_catalog.py`, catálogo canônico
   `curriculum/ai-literacy/catalog.yaml` e `@aidevschool/evidence`
   (`engines/shared/teaching-evidence/`). O compilador das 32 lições não ganha
   filtro `ia_pratica` (continua no adaptador literacyDojo — decisão AID-3453).
7. **R7 — Evidência aceita antes de release.** Nenhum content-family entra em
   release sem: matriz decidida, gate do engine verde, contrato de evidência
   explícito, prova de acessibilidade/resumabilidade e countersign QA.

## Design

- **Camada de competência (nova, mínima):** a matriz vive como documento
  versionado neste change-id na onda 1; virar campo canônico (ex.:
  `competency:` em catalog.yaml/mission-bindings) só na fatia vertical, via
  PR próprio — sem quebrar consumidores (read models regenerados com
  `python3 -m learner.substrate`; `npm run gen:content` no literacyDojo).
- **Mapa de fusões (princípio):** família canônica por tipo de conteúdo —
  conceito/teoria → `curriculum/ai-literacy/` (YAML canônico); prática de
  chat-tutor → aiDevschoolMvp; jogo/prática guiada → ZAI/voxel/pixel;
  processo dev → docs/curso-simples + workflows + sdlc-quest; projeto →
  curriculum/01–18. Engines que hoje duplicam teoria passam a consumir o
  canônico (ex.: ZAI `curriculum-data.ts` é candidato a read model, decisão
  detalhada na frente CPE com prova de dependências).
- **Cobertura atual do seam (evidência, main 1975e2c7):**
  `mission-bindings.yaml` = 41 bindings: 24 `ai-pratica` (l01–l24) +
  17 `dev` (game-02–game-18). Lacunas: l25–l32 sem binding; jornadas dev
  não-voxel (workflows 02–11, curso-simples M1–M9 + ciclos, sdlc-quest,
  projetos 01–18) sem binding.
- **Views derivadas:** qualquer mudança em catálogo/bindings exige regenerar
  `.mavis/` e read models (`python3 -m learner.substrate`), e atualizar
  `engines/codexDojo/ecosystem/MANIFEST.md` se contratos produto-facing mudarem.

## Contrato de release pedagógico (R5)

Release de conteúdo/currículo ≠ merge de PR ≠ board/R2. Uma família ou fatia
está "em release pedagógico" somente quando **todas** as linhas abaixo têm
evidência citada:

| # | Condição | Prova exigida |
| --- | --- | --- |
| RC-1 | Matriz: linhas da fatia com decisão decidida (não proposta) | `curriculum-matrix.md` revisado (frente CCE) |
| RC-2 | Conteúdo canônico válido | validate do próprio curriculum + suíte do engine verde (comandos do AGENTS.md raiz) |
| RC-3 | Bindings/substrate consistentes | `python3 -m learner.substrate` valida + views regeneradas |
| RC-4 | Evidência de aprendizagem não-inflada | contrato de evidência por família (literacy-evidence / teaching-evidence / executable evidence de projeto); `completed`/`pass`/simulação NÃO são mastery |
| RC-5 | Acessibilidade + retomada | verificação independente (frente QA): navegação por teclado/leitor mínima e progresso retomável sem perda |
| RC-6 | Revisão independente | countersign de agente distinto (produtor ≠ verificador) no PR da fatia |

Board/R2 e decisões de negócio seguem fora deste contrato (limite da issue).

## Policy applied

- AGENTS.md raiz (one learner, one curriculum, many engines; producer ≠
  verifier; merges só por `scripts/merge_pr.sh` com countersign — nenhum merge
  é executado nesta onda).
- AID-1721 (mapa lição ponta a ponta), AID-2123 (integridade ai-literacy
  canônico vs engines), AID-2115 (teaching-evidence + read model) — reusados
  como baseline; baseline pytest citado: 1040 passed, 2 skipped (PR #438 era).
- ADR-0004 (verificação falsável p/ unidades no-code), contrato
  `docs/design/micro-lesson-contract.md`, jornada canônica
  `docs/design/canonical-learner-journey.md`.

## Flagged concerns

1. **Contagem ZAI diverge da issue** (19 lições/7 módulos vs "27"): dono CCE;
   se 27 for contagem antiga, a matriz registra a divergência como achado.
2. **"18 tarefas + 16 TLC + 6 gates" do SDLCQuest**: 18 missões tipadas e 16
   módulos TLC verificados no fonte; os "6 gates" ainda sem citação exata —
   dono CPE/UX (open question 2 do intent).
3. **Risco de fusão ZAI↔literacy**: trocar `curriculum-data.ts` por read
   model pode quebrar tests/e2e do ZAI — exige prova de dependências antes;
   alternativa: ZAI vira consumidor gradual (por módulo).
4. Políticas de release de conteúdo ainda não têm portão mecânico (RC-1..RC-6
   são checklist de revisão, não CI) — escalado como follow-up, não bloqueio.

## Out of scope (desta onda)

Deploy/restart de produção, segredos, ampliação de acesso, compras, merges
(automáticos ou não), remoções executadas, recrutamento de piloto, mudança no
gate AID-1222, reescrever engines, mover o filtro `ia_pratica` para o
compilador.
