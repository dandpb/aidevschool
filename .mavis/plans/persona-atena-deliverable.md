# Deliverable — persona Atena

## Summary
Criei `agent.md` (160 linhas) + `PERSONA.md` (193 linhas) para a persona **Atena** (painel
de métricas do ÁGORA Continuum) em DOIS lugares: `~/.mavis/agents/atena/` e
`engines/minimaxDojo/agents/11_atena/`. Os 4 arquivos são byte-idênticos em pares
Mavis↔engine (MD5 match). Estrutura 7+6 seções segue o padrão cartografo/promotor;
conteúdo alinhado com o system prompt canônico (`prompts/per_agent/atena.md`),
com `docs/06_metrics_quality_gate.md` e com o README de `11_atena`.

## Changed files
- `~/.mavis/agents/atena/agent.md` (criado, 160L, 9466B, MD5 `caba017c3feb3d46ac613396fad2071e`)
- `~/.mavis/agents/atena/PERSONA.md` (criado, 193L, 10839B, MD5 `c7cd32cf236102f8e68f0e0325cae815`)
- `engines/minimaxDojo/agents/11_atena/agent.md` (criado, byte-idêntico ao mavis)
- `engines/minimaxDojo/agents/11_atena/PERSONA.md` (criado, byte-idêntico ao mavis)

Nenhum arquivo foi modificado — todos foram **criados do zero** (o diretório
`11_atena/` só tinha `README.md`; o `~/.mavis/agents/atena/` só tinha `config.yaml`,
`memory/`, `opencode/`, `sessions/`, `skills/`, `workspace/`).

## Structure
**agent.md — 7 seções (pt-BR):**
1. Voz & registro
2. Disciplina de evidência
3. Limites (não saia da raia)
4. Gestão de estado
5. Disciplina assíncrona
6. Memória
7. Ambiguidade

**PERSONA.md — 6 seções (pt-BR):**
1. Princípios invariantes
2. Workflow (por ciclo)
3. Anti-padrões a evitar
4. Modelos mentais que você traz
5. Saída
6. Voz

## Notes for the verifier

**Conceitos canônicos honrados (do system prompt + README + 06_metrics_quality_gate):**
- **Modelo:** opus (análise composta) — explicitado em `agent.md` § intro; segue a
  convenção de não repetir no `PERSONA.md` (que herda do `agent.md`, igual
  cartografo/promotor). Observação: `docs/01_agent_roster.md` § 11 diz opus;
  `00_IDEIAS.md` (Claude/ultracode) dizia Sonnet. A escolha do opus é a do
  task spec e a do `01_agent_roster.md` canônico.
- **Papel:** painel de métricas. NÃO escreve código (declarado em ambos os
  arquivos, seções Limites / intro).
- **Quality Gate composto sobre código NOVO:** CC mediana <10, complexidade
  cognitiva, mutation score (≥ 0.65, default do `06_metrics_quality_gate.md`),
  duplicação <7%, TDR <5%, reliability/security. Tabela `Métrica | Valor |
  Threshold | Status` obrigatória.
- **Eixo B — Aluno:** velocidade, acurácia, autonomia, Dreyfus × Bloom (mapa
  cumulativo por conceito), qualidade da reflexão (0–5), AIDI.
- **AIDI bounded:** 0.10–0.30 saudável; > 0.60 amarelo; > 0.75 vermelho
  (escala Sêneca). Explícito em ambos os arquivos.
- **Proibido:** DORA, velocity, LoC como qualidade, AIDI < 0.10 como meta.
  Todos declarados como anti-padrões.
- **Contexto isolado:** vê `verdict_promotor` + `review_critico` +
  `reflexao_aluno` + `event_log`; **NÃO** vê `solution/`, prompts
  pedagógicos, ou histórico Sonda. Declarado em ambos.
- **Activation triggers:** fim de ciclo (snapshot para `cycle_report.md`) +
  por demanda (recalcular AIDI, ajustar threshold didático). Em
  `Disciplina assíncrona` (agent.md).
- **Exceção didática:** 1 violação consciente marcada em `DoD.md` + ADR =
  não-bloqueante. Mais que 1, ou sem ADR = bloqueante. Em Princípios
  invariantes + Workflow.
- **Boundary vs. Promętor:** Atena compõe sobre a saída do Promętor (eixo A
  cru); quem fecha o portão objetivo é o Promętor. Limites explícitos.
- **Boundary vs. Maestro:** Atena recomenda; quem decide é o Maestro.
  Limites explícitos.

**Byte-identity Mavis↔engine:** `diff -q` retorna vazio para os 2 pares;
MD5 match confirmado. Padrão igual aos peers (cartografo, socrates,
promotor, mneme).

**Estrutura 7+6:** atende o spec do task. Adicionei `## Princípios
invariantes` no `PERSONA.md` (6ª seção) para alinhar com a abertura do
system prompt canônico (`prompts/per_agent/atena.md` § "PRINCÍPIOS
INVARIANTES") e com a contagem 7+6 do task. Os pares cartografo/promotor
tinham 7+5; mneme/socrates já tinham 7+6/7+6 com seções iniciais extras.

**Decisões editoriais:**
- Mantive o texto todo em pt-BR com identifiers técnicos em forma nativa
  (`stryker`, `mutmut`, `lizard`, `whiteboard/...`, `verdict.md`,
  `metrics_snapshot.md`, `ndjson`, `MADR`).
- Tom analítico, sem motivação. Pediu-se "evidência primeira"; cabei
  aspas em "parabéns", "show", "bom trabalho" como proibidos.
- Detalhei a tabela de bandas AIDI (verde/amarelo/vermelho) em ambos os
  arquivos para fechar a leitura sem precisar abrir o `06_metrics`.
- Referenciei o catálogo canônico (`docs/06_metrics_quality_gate.md`) e
  o system prompt (`prompts/per_agent/atena.md`) em ambos os arquivos
  para que o agente saiba onde achar a fonte.
