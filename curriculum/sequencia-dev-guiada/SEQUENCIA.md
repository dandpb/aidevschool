# Sequência Dev guiada — documento versionado (AID-3510)

**Versão:** r1 · **Base:** `d9dbdd5c504ef76a42d3f7944392dccee3eb6351` (`main`)
**Papel:** sequência didática executável da jornada **IA para Dev** (D1–D7)
após os fundamentos, por objetivo/pré-requisito, com classificação
pronto/adaptação/lacuna e seleção da primeira unidade (pg-d01).
**Deduplicação explícita:** consome sem refazer — inventário/matriz r2.1
(AID-3456), matriz de competências l01–l32 r3 (AID-3497, doc
`matriz-competencias-32` rev `1fee56a2-a980-4199-97ad-50cfe066c001`),
metadados P/S (AID-3505, PR #612/#619 em revisão), práticas de transferência
tp-c01/tp-d01 (AID-3506, PR #619 draft `7259dbc5a9eb`). Nenhuma decisão
ratificada é reaberta aqui.

## 1. Fontes (arquivo + blob na base)

| Família | Fonte (base `d9dbdd5c504e`) | Papel na sequência |
| --- | --- | --- |
| 9 YAMLs Dev (l15–l17, l21–l23, l27–l29) | `curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/*.yaml` (blobs `a839a433efab`, `faf30f1c88c1`, `dfebdbb2290e`, `0dca02a01ef2`, `9e063a872de4`, `f04478753063`, `6c9cc6b015d2`, `386c27fe1a6b`, `006ca4e6761c`) | Micro-lições da trilha `dev` (já bound no OS) — espinha dorsal D1/D3/D4/D5 |
| Catálogo literacy | `curriculum/ai-literacy/catalog.yaml` (blob `eafcbc196b35`) | mod-05 `Dev: contexto e decisão`, jornada `dev` |
| curso-simples M1–M9 | `docs/curso-simples/index.html` (blob `2bcf99fbd831`) + `ROADMAP.md` (blob `5dc6f72ce505`) | Aprofundamento D1/D2/D6 (10 semanas, gates por fase) |
| Exemplo executável do curso | `docs/curso-simples/workflow-exemplo/` (`release_notes.py` blob `8bbe0fdffcf5`; 22 testes) | Fixture de reprodução e do pedido de 5 campos |
| Workflow Lab | `docs/curso/workflow_lab/` (`SPEC.md` blob `82c2b93539b7`, `README.md` blob `f6d878f6db01`; ciclos 00–10, fixtures JSON, suíte pytest) | Escada de prática determinística D2/D4 (11 ciclos com gates) |
| Workflows testados | `dev-workflow-claude/workflows/02..11` (ex.: `02-corrigir-bug/RESULTADO.md` blob `bdfab8fb6160`) | Playbooks reais com demos executáveis para D3/D4 |
| Práticas de transferência | `curriculum/praticas-transferencia/` (PR #619 draft `7259dbc5a9eb`, **não em main**) | Tarefas inéditas de fechamento (tp-d01 Dev) |

Competências (glossário ratificado, `intent/AID-3453-unify-school/spec.md`
R1/R2): D1 fundamentos/harness → D2 intenção/spec/plano → D3 construção →
D4 teste/debug/review/manutenção → D5 produto IA/evals → D6
agentes/tools/skills → D7 capstone. Mapeamento P/S por lição: matriz r3
(AID-3497) — não reproduzido aqui, apenas consumido.

## 2. A sequência (unidades por objetivo/pré-requisito)

Regra de cadência: cada unidade = 1 sessão de 25–40 min (padrão Duolingo da
escola); prática obrigatória com evidência local; nenhuma unidade exige rede.

| Ordem | Unidade | Objetivo observável | Pré-req | Fonte principal | Prática | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| U01 | Decidir quando usar IA (`l15`) | decidir com critério quando IA ajuda | — | YAML l15 | atividades do YAML | **pronto** (lição bound no OS) |
| U02 | Pedido de código com contexto (`l16`) | pedir código com contexto técnico suficiente e avaliar a resposta | U01 | YAML l16 | atividades do YAML | **pronto** (bound) |
| U03 | Pedido estruturado de 5 campos (M3) | reescrever pedido real em CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META | U02 | curso-simples M3 | workflow-exemplo: gerar `meus_commits.json` do próprio repo e rodar o CLI | **adaptação** (ROADMAP Fase 1 → unidade de 1 sessão) |
| U04 | Pedir testes que valem a pena (`l21`) | montar pedido de testes com framework, alvo e borda explícitos | U02 | YAML l21 | atividades do YAML | **pronto** (bound) |
| U05 | Revisar e decidir o que aceitar (`l22`+`l23`) | aplicar critérios objetivos; separar aceitar/recusar com motivo | U02 | YAML l22/l23 | atividades dos YAMLs + exemplo-sucesso/falha de tp-d01 | **pronto** (bound; tp-d01 em PR) |
| U06 | **Debug: reproduza antes de perguntar** (`l27`) | ciclo reprodução→vermelho→fix mínimo→suíte→diff com assistente | U04 | YAML l27 + wf `02-corrigir-bug` | **pg-d01 (este pacote)** | **pronto** (nova prática guiada, U-D4 da sequência) |
| U07 | Refatorar sem quebrar (`l28`) | exigir testes verdes como pré-condição; passos pequenos | U04 | YAML l28 + wf `03-refatorar-seguro` | demo `03` adaptada (rede de segurança) | **adaptação** (demo → prática de 1 sessão) |
| U08 | Avaliar dependências sugeridas (`l29`) | checar manutenção/licença/seguro/alternativa nativa | U05 | YAML l29 | atividades do YAML | **pronto** (bound) |
| U09 | Context engineering (M4/M5) | escrever CONTEXTO.md e PRD+SPEC ≤30 min para feature pequena | U03 | curso-simples M4–M5 | workflow_lab ciclos 05–06 (DAG, renomes seguros) | **adaptação** |
| U10 | Execução guiada e agentes (M6–M8) | plan/build com validações; delegar com controle; skills/MCP | U09 | curso-simples M6–M8 + wf `04`,`07`,`11` | workflow_lab ciclos 07–08 + retro wf `11` | **adaptação** |
| U11 | Integrar API de IA com tratamento de erros (`l17`) | conectar endpoint, tratar erros, decidir cliente/servidor | U02 | YAML l17 | atividades do YAML (D5) | **pronto** (bound) |
| U12 | Capstone de transferência Dev (tp-d01) | avaliar/corrigir sugestão de implementação em fixture inédita | U05+U06 | tp-d01 (PR #619) | tarefa inédita com rubrica própria | **pronto** (em PR; aguardar merge) |

Ordem topológica respeita os pré-requisitos declarados nos YAMLs (l16←l15,
l21/l22←l16, l27/l28←l21, l29←l22) e a progressão D1→D3→D4→D2→D5→D6→D7 do
glossário ratificado: U01–U02 (D1/D3 porta de entrada), U03–U05 (D3), U06–U08
(D4), U09–U10 (D2/D6), U11 (D5), U12 (D7 parcial).

## 3. Classificação e lacunas reais

- **Pronto (7):** U01, U02, U04, U05, U06, U08, U11 — YAMLs bound na trilha
  `dev` do OS (`engines/codexdojo-os-prototype/config/mission-bindings.yaml`,
  blob `bf1d58756dc4`: 16 bindings dev = 9 YAMLs + 7 jogos) + pg-d01 (novo)
  + tp-d01 (PR #619).
- **Adaptação necessária (4):** U03, U07, U09, U10 — conteúdo existe em
  curso-simples/workflows em formato longo (sessões de curso, demos Claude);
  precisa fatiar em unidades de 25–40 min com prática local e feedback.
  **Não é lacuna autoral**: é reengenharia de formato, dono natural CCE.
- **Lacunas reais (2):**
  1. **U13 (D5, evals/produto):** não há unidade de avaliação sistemática de
     qualidade de saída de IA em produto (evals, não só teste unitário).
     Fonte parcial: curso-simples Loop Engineering (M9) — insuficiente.
  2. **U14 (D7, capstone Dev completo):** tp-d01 cobre transferência em
     fixture pequena; falta capstone de workflow ponta a ponta
     (spec→plan→build→verify com evidência executável própria).
  Ambas registradas como próximos trabalhos (§6), **não** produzidas aqui.

## 4. Primeira unidade selecionada: pg-d01 (U06)

**Por quê:** (a) maior densidade pedagógica por minuto — instala a regra de
ouro da escola (certeza de conclusão nunca vive no LLM: reprodução e teste
decidem) num caso de 1 caractere; (b) fixture local **segura e
determinística** (Python puro, sem framework, sem rede/conta/segredo);
(c) exemplo trabalhado real já existe no repo (wf `02-corrigir-bug`, demo
`tempo`/Node) e a tentativa usa problema de natureza diferente (fronteira de
comparação, não regex) — transferência, não cópia; (d) âncora `l27` já bound
na trilha `dev` do OS; (e) pequena: uma sessão.

**Conteúdo:** `pg-d01-debug-reproduza/` — `enunciado.md` (ciclo guiado:
exemplo→tentativa→feedback→retry→takeaway), `exemplo-trabalhado.md` (fonte
real citada), `insumos/` (bugreport, REGRA, fixture `notas.py`+`testes.py`),
`rubrica-v1.md` (6 critérios objetivos com perChecks), `guia-de-correcao/`
(teste de regressão + `solucao/notas.py` + `solucao.md` com saídas reais —
**separado** do enunciado).

**Critérios de aceite da unidade (verificados nesta entrega):**

- AC1 ✔ fixture reproduz o bug deterministicamente com 1 comando (saída real
  registrada em `guia-de-correcao/solucao.md` §Passo 1; verificada nesta
  árvore na base `d9dbdd5c504e`).
- AC2 ✔ suíte existente (5 testes) verde com o bug presente — latência
  provada (§Passo 2).
- AC3 ✔ teste de regressão falha contra a fixture original pelo motivo
  certo (exit 1, `AssertionError` citando APROVADO/REPROVADO em 6.0;
  §Passo 3) e passa com a correção (§Passo 5).
- AC4 ✔ rubrica com veredito por critério e perCheck executável por critério.
- AC5 ✔ nenhum passo exige rede/conta/segredo; fixture determinística.
- AC6 ✔ rastreabilidade: l27 (blob `6c9cc6b015d2`) P:D4 (matriz r3), wf
  `02-corrigir-bug` (blob `bdfab8fb6160`), base pinada.
- AC7 ✔ solução em diretório separado, não referenciada pelo enunciado.

**Ponto de integração real (sem rota inventada):** a superfície Dev hoje é o
OS (`mission-bindings.yaml`, trilha `dev` — 9 YAMLs bound), exposto pelo CTA
"Trilha Dev → Abrir no OS" do literacyDojo
(`engines/literacyDojo/src/screens/OnboardingScreen.tsx:170–183`, blob
`3b794e816bc5`). pg-d01 **não** altera runtime/progresso nesta entrega; a
fatia de app (mission/atividade no OS consumindo este pacote) é follow-up do
dono de `/engines/` (Learning Engine Engineer), ver §6.

## 5. Cadência e limites

- Todas as unidades ≤ 40 min; prática com evidência local; retry por critério.
- Anti-escopo: não altera PRs #610–#619 congelados, não cria engine, não
  toca runtime/progresso/`learner/`, não toca pilotos AID-1222/641/909, sem
  merge/deploy (draft PR desta entrega passa por countersign distinto, porta
  `scripts/merge_pr.sh`).
- Nenhuma afirmação de transferência comprovada ou de resultado de alunos; a
  sequência descreve entrega didática, não eficácia medida.

## 6. Próximos trabalhos (específicos, com dono)

| # | Trabalho | Dono | Depende de |
| --- | --- | --- | --- |
| P1 | Fatia de app: missão pg-d01 no OS (binding + atividade consumindo `curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/`) | Learning Engine Engineer (`98ed5775`, CODEOWNERS `/engines/`) | merge deste PR; revisão CD da unidade |
| P2 | Fatiar U03/U07/U09/U10 (adaptação curso-simples/workflows → unidades 25–40 min) | CCE (eu; fila via CEO) | aprovação desta sequência (CD) |
| P3 | Lacuna U13 (evals D5): autoria de unidade nova | CCE + CPE (schema se novo formato) | decisão de escopo da CEO |
| P4 | Lacuna U14 (capstone D7): tarefa ponta a ponta com rubrica | CCE; revisão CD | tp-d01 merged (PR #619) |

## Provenance

- Produtor: Curriculum Content Engineer (agente `93e26ea9-8f2a-4f6f-9b82-3591ebc4255c`), tarefa AID-3510.
- Todas as saídas citadas da fixture pg-d01 foram executadas nesta árvore
  na base `d9dbdd5c504e` (Python 3.13); nenhum passo usa rede.
- Documento versionado: alterações futuras = r2 (não editar r1 in place).
