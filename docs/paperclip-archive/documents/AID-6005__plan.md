<!-- issue: AID-6005 | key: plan | doc_id: a66c5aed-ccb0-47fa-b29b-ad52d5321cd5 | updated: 2026-11-01 10:21:08.974+00 -->

# AID-6005 — Triagem das superfícies públicas e replanejamento do lançamento

(AID-6005)

# AID-6005 — Triagem das superfícies públicas e replanejamento do lançamento

**Autor:** CEO · **Data:** 2026-11-01 · **Status:** proposta para confirmação do founder
**Método:** análise das 6 URLs da descrição + LiteracyDojo (adicional), verificação ao vivo (HTTP 200 em todas, 2026-11-01), cruzamento com `docs/product-readiness/inventory.yaml`, `docs/VISION.md`, `docs/PRODUCT_ONBOARDING_AUDIT_2026-08-04.md` e `APRENDIZADOS.md`.

## 1. Diagnóstico

- Hoje existem **7 URLs públicas** para o que é, na prática, **um produto com dois públicos**. Quatro marcas de engine (codexDojo, dojoToday, voxelDojo, pixelDojo) + LiteracyDojo competem pela atenção do aluno.
- 3 das 6 URLs da sua lista **não têm claim válido para estarem públicas**:
  - `codexDojo` (dashboard): nenhum use case no `inventory.yaml`.
  - `PixelQuest`: o use case customer-ready foi verificado contra o **app local**; o binding deploy↔pin nunca foi promovido.
  - `miniTown`: tier **experimental**, entrada declarada é "rota local" — e o título em produção é literalmente **"MiniTown — Engine Skeleton"**.
- A experiência de aprendizado real (microlições 3–5 min) está no **codexDojo OS** (hospeda IA na Prática + trilho Dev WAREHOUSE→WORMHOLE→RELAY STATION) e no **LiteracyDojo avulso** — exatamente as duas URLs que `docs/VISION.md` já define como lançamento.
- O diagnóstico do `APRENDIZADOS.md` (2026-08-17) segue valendo: muita infraestrutura e superfícies paralelas para pouco valor verificado por aluno. **"Fechar uma fatia vertical pequena vale mais que replicar arquitetura antes de provar valor."**

## 2. Triagem proposta (7 → 2 URLs de lançamento)

| # | App | URL pública | Veredito | Por quê |
|---|---|---|---|---|
| 1 | codexDojo OS | aidevschool-codexdojo-os.netlify.app | **MANTER** — entrada principal | Único host mission-first; serve os dois públicos (IA na Prática + Dev); 3 use cases customer-ready; escolha de trilha no onboarding. |
| 2 | LiteracyDojo | aidevschool-literacydojo.netlify.app | **MANTER** — entrada avulsa IA na Prática | 2 use cases customer-ready; é a oferta central para não-técnicos (não estava na sua lista, mas é onde está o maior valor de lançamento). |
| 3 | dojoToday | aidevschool-dojotoday.netlify.app | **DEMOVER** a secundária | Somente leitura (revisões FSRS, unidade ativa); é companion, não ensina sozinho; fica como rota declarada, fora do marketing de lançamento. |
| 4 | voxelDojo "Armazém KV" | aidevschool-voxel-warehouse.netlify.app | **RETIRAR** do público (manter engine) | A missão WAREHOUSE já roda hospedada dentro do OS; URL avulsa duplica a entrada. Engine continua alimentando o trilho Dev. |
| 5 | miniTown | aidevschool-minitown.netlify.app | **RETIRAR** do público | Experimental, sem lição nem progresso; título em produção é "Engine Skeleton". Volta só se um teste A/B provar que melhora onboarding. |
| 6 | pixelDojo / PixelQuest | aidevschool-pixelquest.netlify.app | **RETIRAR** do público (manter engine local) | Use case verificado contra o app local; binding deploy↔pin não promovido — sem claim válido para o deploy público. |
| 7 | codexDojo (dashboard) | aidevschool-codexdojo.netlify.app | **RETIRAR** do público | Ferramenta interna de contribuidor; sem claim no inventory. |

## 3. Lições aprendidas (o que corrigir de vez)

1. **Publicamos superfícies antes de valor.** 7 URLs e 4+ marcas com nenhum funil de uso comprovado.
2. **URL pública sem claim virou normalidade.** 3 dos 6 apps da lista estão no ar sem use case customer-ready apontando para aquela rota.
3. **A cara do produto virou o nome da engine.** O aluno vê "codexDojo", "voxelDojo", "dojoToday" — marcas de infraestrutura, não benefício.
4. **Entrada do aluno dividida.** OS, Engine Hub, avulso e deploys avulsos competem; ninguém sabe onde começar.

**Gate de publicação (regra nova):** nenhuma URL pública sem (1) use case customer-ready no `inventory.yaml` apontando a rota pública, (2) binding deploy↔pin promovido com recibo, (3) título/copy voltado ao aluno (não à engine), (4) dono nomeado. Sem isso, fica local.

## 4. Replanejamento — um aluno, uma lição, um clique

**Norte:** qualquer pessoa conclui uma microlição de 3–5 min no 1º acesso e tem um motivo claro para voltar no dia seguinte.

| Fase | Janela | Entrega | Gate empírico |
|---|---|---|---|
| **0 — Limpeza e foco** | semana 1 | Executar a triagem: teardown/redirect das 4 URLs; atualizar `inventory.yaml`, `student-guide`, `README`, `VISION`, `MANIFEST`; runbook de teardown Netlify | As 4 URLs fora do ar ou redirecionando para o OS; docs consistentes com 2 entradas |
| **1 — Fatia vertical dupla** | semanas 1–2 | IA na Prática: l01–l03 polidas (onboarding pt-BR enxuto, Mapa Inicial). Dev: WAREHOUSE→WORMHOLE→RELAY STATION. Cada jornada inteira em 1 URL | 3 alunos reais por público completam a 1ª lição em <5 min sem ajuda |
| **2 — Ritmo Duolingo** | semanas 3–4 | Meta diária + streak local, revisões espaçadas [1,7,21], funil medido (início → 1ª lição → retorno D+1) | ≥40% dos testadores voltam em D+1 |

**Congelamento (APRENDIZADOS.md §5):** nenhum engine, jogo ou URL nova até a Fase 2 passar o gate.

## 5. Divisão de execução (pós-confirmação)

- **CEO (via issues filhas + PRs pela porta única `scripts/merge_pr.sh`):** PR de docs/inventory/manifest; runbook e verificação do teardown; revisão de títulos/copy das 2 URLs; montagem da medição de funil da Fase 2.
- **Founder:** executar o teardown no Netlify (credenciais são suas — ou delegar sessão para eu preparar os comandos exatos); decisão de marketing entre as opções abaixo.

## 6. Alternativas

- **A (recomendada):** 2 URLs de lançamento (OS + LiteracyDojo) + dojoToday secundária.
- **B (mais radical):** só o OS público; LiteracyDojo avulso também sai (tudo hospedado no OS).
- **C (mais conservadora):** A + dojoToday como 3ª URL de lançamento.
