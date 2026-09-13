# Readiness Refresh Plan — Dev journeys (01–18)

| Campo | Valor |
| --- | --- |
| Issue | AID-1585 (onboarding Docs & Readiness Engineer) |
| Criado | 2026-09-12 |
| Autor | Docs & Readiness Engineer (agente) |
| Status | `in_review` (PR-first; merge pelo FPE — single-writer até R1) |
| Baseline | main @ `6ec26544` (2026-09-12) |
| Escopo | (A) Status `stale` na matriz de readiness; (B) status das Dev journeys 01–18 em `curriculum/catalog.md` |

---

## 1. Contexto — o que está stale hoje (2026-09-12)

### (A) Matriz de product readiness (`docs/product-readiness/README.md`, gerada)

Linhas com `Current outcome = stale`:

| Use case | Tier pretendido | Motivo do stale | Owner (inventory.yaml) |
| --- | --- | --- | --- |
| `os-voxel-guided-missions` (jornada Dev, programmer-learner) | `customer-ready` | fingerprint stale nos 3 cenários (`os-voxel-hosted-missions`, `os-renderer-accessibility-recovery`, `os-voxel-returning-device`) | `codexdojo-os-prototype` (`inventory.yaml:91`) |
| `minitown-explore-only` (experimental) | `experimental` | fingerprint stale do cenário `minitown-explore-only` | `miniTown` (`inventory.yaml:179`) |

Fonte: `docs/product-readiness/README.md:13` e `:16` (matriz gerada por `tools/cli.py render`).
O stale aqui é **por design** (gate fail-closed): mudanças nos `sourcePaths` após a última decisão
independente invalidam o fingerprint até um novo re-grant (`REGRANT-RUNBOOK.md`; `policy.yaml`).

### (B) Dev journeys 01–18 (`curriculum/` — "Trilha Dev" per `docs/VISION.md:22`)

- Status canônico: `curriculum/catalog.md` (19 entradas; 01–18 = projetos de código).
  - `01_rate_limiter` → `✅ Implemented` (`catalog.md:59`)
  - `02_key_value_store` → `Partially implemented` (`catalog.md:77`)
  - `03`–`18` → `scaffolded` (`catalog.md:95` em diante), com projeção `BACKLOG_STATUS.md` dizendo
    "Project artifacts exist; catalog verification is pending" para as 16 entradas.
- **Lacuna estrutural:** claims de evidência do catálogo **não têm data de verificação nem prazo de
  revalidação** (ex.: "re-executed 2026-08-17" em `catalog.md:65-67` é a última data embutida no texto;
  a matriz de product-readiness tem `verifiedAt`/`revalidateBy`, o catálogo não tem equivalente).
- Varredura de diretórios (2026-09-12, main @ `6ec26544`): todas as 18 têm `docs/spec.md` + `node-impl/`;
  apenas 02, 05, 12, 18 têm diretório de testes além do 01 — o claim "scaffolded" nunca foi verificado
  item a item contra o disco.

## 2. Método de re-avaliação (por item, determinístico e rastreável)

Regra de ouro: **certeza de conclusão nunca vive no LLM** — cada status novo nasce de verificador
determinístico executado contra um SHA pinado, com evidência datada citando arquivo/linha/URL.

Passo a passo por jornada:

1. **Pinne o baseline**: registrar SHA da main e data/hora UTC de execução.
2. **Verificação determinística (producer facts)**:
   - Node: `npm install --include=dev && npm run lint && npm run build && npm run test` dentro de
     `<projeto>/node-impl` (atenção: o sandbox usa `omit=dev` no `.npmrc` — exigir `--include=dev`).
   - Go/Rust (quando existirem): `go vet`, `go test -race -cover ./...`; `cargo fmt --check`,
     `cargo clippy --all-targets -- -D warnings`, `cargo test` — só registrar se o toolchain executar
     de fato; senão reportar como "não re-executado neste ambiente" (não maquiar).
3. **Evidência independente adicional**: check-runs do CI no mesmo SHA
   (ex.: job `curriculum Node (18 projects)` — ver amostra §4) + presença física dos artefatos
   citados no claim (spec, tests, review, benchmark, evolution).
4. **Registro datado**: acrescentar ao catálogo (ou a um relatório datado em
   `docs/product-readiness/assessments/`, sem editar domínio de engine) a linha
   `verified <AAAA-MM-DD> @ <sha> by <executor>` com o resultado bruto.
   - Mudança de **status** no catálogo exige a mesma barreira da matriz: produtor ≠ verificador.
   - Docs de domínio de engine só com o dono (`docs/AGENTS.md`).
5. **Jornadas da matriz (A)**: refresh = novo re-grant seguindo `REGRANT-RUNBOOK.md`
   (aggregate → assess → check → pytest; CI nunca concede tier). Execução pertence ao fluxo
   do owner da engine; este papel reporta a lacuna e audita o resultado.

## 3. Fonte por claim (single source of truth)

| Claim | Fonte canônica | Projeção/verificação |
| --- | --- | --- |
| Tier/prontidão por use case | `docs/product-readiness/policy.yaml` + `inventory.yaml` + `assessments/*.yaml` | matriz gerada `README.md` (`tools/cli.py render`); gate CI `product readiness (claims)` (`.github/workflows/ci.yml:411`) |
| Status dos projetos 01–18 | `curriculum/catalog.md` | `curriculum/BACKLOG_STATUS.md` (gerada por `python3 -m learner.substrate`; nunca editar direto) |
| Evidência executável por projeto | `<projeto>/node-impl` (testes), `<projeto>/docs/*` | execução pinada + check-runs do CI no mesmo SHA |
| Promessa por jornada (estudante/facilitador) | `student-guide.md` / `facilitator-guide.md` | anchor checker (proposto, §7-P2) |

## 4. Amostra executada — Dev journey `01_rate_limiter` (fresh, 2026-09-12)

Executada por este agente em 2026-09-12 22:10–22:12 UTC, main @ `6ec26544`, working tree clean
(`node_modules` é gitignored; verificação read-only sobre o repositório).

| Claim do catálogo | Fonte do claim | Re-verificação fresca | Resultado |
| --- | --- | --- | --- |
| Status `✅ Implemented` | `curriculum/catalog.md:59` | ver abaixo | **confirmado** para a parte Node |
| Node: "55 tests + 1 pre-existing `it.todo`" | `catalog.md:67` | `npm run test` → `Test Files 5 passed (5)`, `Tests 55 passed \| 1 todo (56)` (589ms) | **confirmado** (idêntico) |
| Node: lint/tsc clean (implícito no caveat) | `catalog.md:61` | `npm run lint` → exit 0; `npm run build` (tsc) → exit 0 | **confirmado** |
| CI da trilha Node no mesmo SHA | — | job `curriculum Node (18 projects)` = success; rollup do commit: 39 check-runs = 37 success + 2 skipped, 0 fail — https://github.com/dandpb/aidevschool/actions/runs/34724009871/job/103634835828 | **confirmado** |
| Go coverage "re-executed 2026-08-17" | `catalog.md:65` | **não re-executado aqui** (sem toolchain Go neste sandbox) | claim datado de 2026-08-17 permanece; re-execução agendada (Wave 1, com CI `curriculum Go` como evidência provisória: success no mesmo SHA — https://github.com/dandpb/aidevschool/actions/runs/34724009871/job/103634835882) |
| Rust tests "re-executed 2026-08-17" | `catalog.md:66` | **não re-executado aqui** (sem toolchain Rust) | idem: CI `curriculum Rust` success no mesmo SHA — https://github.com/dandpb/aidevschool/actions/runs/34724009871/job/103634835891 |

Veredito da amostra: o status `Implemented` da jornada 01 **continua verdadeiro** na parte Node com
evidência fresca e independente (execução local + CI no mesmo SHA); as partes Go/Rust ficam
dependentes de claims de 2026-08-17 corroborados só pelo CI — reportado como está, sem maquiar.

## 5. Cronograma (a partir da aprovação deste plano)

| Wave | Janela | Itens | Critério de saída | Owner |
| --- | --- | --- | --- | --- |
| 0 | hoje (feito) | plano + amostra 01 (este doc) | PR aberto, issue `in_review` | Docs & Readiness |
| 1 | D+1 a D+2 | re-verificação Node de 02, 05, 12, 18 (têm testes) + registro datado | linha `verified` por jornada; divergências viram issue | Docs & Readiness |
| 2 | D+3 a D+5 | inventário 03–17 (scaffold × disco) + relatório datado; escalonar stale da matriz: `os-voxel-guided-missions` e `minitown-explore-only` aos owners | relatório por item; issues de re-grant criadas para os owners (engine domain) | Docs & Readiness + owners de engine |
| 3 | D+6 a D+7 | automação P1/P2 (§7) + proposta de cadência semanal | PRs de ferramenta verdes | Docs & Readiness |
| contínuo | após | cadencia semanal de `check`/refresh | matriz sem linha stale >7d sem dono ativo | Docs & Readiness |

## 6. Lacunas reportadas (sem maquiar)

1. `os-voxel-guided-missions` (jornada Dev, tier pretendido `customer-ready`) está `stale` —
   requer re-grant do owner `codexdojo-os-prototype`; fora do meu domínio executar.
2. `minitown-explore-only` (`experimental`) está `stale` — idem, owner `miniTown`.
3. O catálogo 01–18 não tem campos de data/prazo (`verifiedAt`/`revalidateBy`) — qualquer claim
   envelhece silenciosamente (ex.: 2026-08-17 é a última data embutida no texto do 01).
4. 16/18 journeys `scaffolded` sem verificação item a item ("catalog verification is pending",
   `BACKLOG_STATUS.md:12-27`).
5. Claims Go/Rust do projeto 01 dependem de execução de 2026-08-17; neste sandbox não há toolchain
   para re-executá-los (corroboração só via CI).

## 7. Automação — mapa

**Já existe (não duplicar):**
- Geração da matriz: `python3 docs/product-readiness/tools/cli.py render` (a partir de fontes
  canônicas); integridade via `check`; staleness via `enforce`; re-grant semi-automático
  (`regrant --propose`) — `docs/product-readiness/tools/cli.py`, fluxo AID-1357.
- Gate CI fail-closed: `product readiness (claims)` (`.github/workflows/ci.yml:411`).
- Projeção do catálogo: `python3 -m learner.substrate` regenera `BACKLOG_STATUS.md`.

**Propostas (novas, sob `docs/`, PR-first):**
- **P1 — `catalog-dated-claims` checker** (Python, read-only): parse de `curriculum/catalog.md`;
  extrai datas embutidas ("re-executed AAAA-MM-DD"), compara com `git log -1` do diretório do
  projeto e com a última execução registrada; emite relatório datado em
  `docs/product-readiness/assessments/` e exit ≠ 0 se claim > 30d sem re-verificação. Alimenta a
  Wave 1/2 e a cadência semanal.
- **P2 — anchor/link checker dos guias**: valida que cada `manualRefs` de `inventory.yaml`
  (`student-guide.md#...`, `facilitator-guide.md#...`) aponta para âncora existente e que rotas
  públicas declaradas respondem 200 (o inventário declara URLs públicas). Falha → issue, não retry.
- **P3 (decisão, não código):** acrescentar ao catálogo campos `verified`/`revalidateBy` por
  projeto, espelhando a semântica da matriz — requer decisão do dono do currículo (escalada FPE → CEO),
  pois muda fonte canônica compartilhada.

## 8. Regras de execução

- PR-first; **sem merge em `main`** (single-writer FPE até política R1).
- Não mudar produto para arrumar docs: lacuna vira relatório/issue, nunca "status otimista".
- Docs de domínio de engine somente com o dono da engine.
- Toda avaliação cita arquivo/linha/URL; toda data é UTC e via de execução verificável.
