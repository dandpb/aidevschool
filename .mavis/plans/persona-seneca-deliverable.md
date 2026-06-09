# Deliverable — persona SÊNECA (portão humano no loop)

## Summary

Criei `agent.md` e `PERSONA.md` do agent **Sêneca** (portão humano no
loop, modo auto-escala, sem instrutor humano) em pt-BR autoritativo,
ancorado em [`engines/minimaxDojo/prompts/per_agent/seneca.md`](engines/minimaxDojo/prompts/per_agent/seneca.md)
(231L: 5 princípios invariantes, 8 categorias de auto-escala, 9 decisões
consequentes da lista negra, 3 SLAs reduzidos, 6 cenários de escalação
imediata, templates `sla_status.md` + ADR MADR), em
[`engines/minimaxDojo/docs/07_governance_sla.md`](engines/minimaxDojo/docs/07_governance_sla.md)
(194L: dois modos, 9 decisões consequentes, 3 SLAs reduzidos), em
[`engines/minimaxDojo/agents/14_seneca/README.md`](engines/minimaxDojo/agents/14_seneca/README.md)
(15L: 4 gatilhos + read-only no whiteboard + modelo opus) e em
[`docs/PROMPTS/00_IDEIAS.md`](docs/PROMPTS/00_IDEIAS.md) § SÊNECA (item
14 dos 14 agentes, "auto-escala / auto-rejeita / loga toda intervenção").
Sigo o padrão 7+6 do Cartógrafo/Ouroboros (Mavis pt-BR + engine com
overlay operacional do dojo). Os dois pares Mavis↔engine são
**byte-idênticos** (md5 confere em ambos).

## Changed files

| Path | Status | Bytes | Linhas | md5 |
| --- | --- | ---: | ---: | --- |
| `~/.mavis/agents/seneca/agent.md` | **NOVO** (dir criado) | 22269 | 389 | `7f8e8313e807aa60d96c220427158bac` |
| `~/.mavis/agents/seneca/PERSONA.md` | **NOVO** (dir criado) | 23982 | 457 | `2d26f2042b26dbe6ade0280d748f0c6a` |
| `engines/minimaxDojo/agents/14_seneca/agent.md` | **NOVO** (já tinha só `README.md`) | 22269 | 389 | `7f8e8313e807aa60d96c220427158bac` |
| `engines/minimaxDojo/agents/14_seneca/PERSONA.md` | **NOVO** (já tinha só `README.md`) | 23982 | 457 | `2d26f2042b26dbe6ade0280d748f0c6a` |

> **NOTA:** a task apontava `minimaxDojo/agents/14_seneca/` (caminho que
> não existe); o caminho real é `engines/minimaxDojo/agents/14_seneca/`
> (sob `engines/`). Confirmei via `AGENTS.md` raiz e via `ls -la`. Usei
> o caminho real — o mesmo ajuste feito pelas personas anteriores
> (Cartógrafo, Mneme, Sonda, Atena, etc.).

## Pre-delivery verification (checklist da task)

- [x] Os 4 arquivos existem
  - `ls -la` em ambos os pares retornou datas e tamanhos idênticos.
- [x] `diff(agent.md Mavis, agent.md repo)` vazio
  - `diff -q` (chamada fresca após `cp` + `md5`) → sem output → **IDENTICAL**
  - md5 confere: `7f8e8313e807aa60d96c220427158bac` em ambos.
- [x] `diff(PERSONA.md Mavis, PERSONA.md repo)` vazio
  - `diff -q` (chamada fresca) → sem output → **IDENTICAL**
  - md5 confere: `2d26f2042b26dbe6ade0280d748f0c6a` em ambos.
- [x] Estrutura segue padrão 7+6
  - `agent.md`: 7× H2 = `Voz & registro` · `Disciplina de evidência`
    · `Limites (não saia da raia)` (com H3 `Classificação de ação
    (confiança × reversibilidade × impacto)`) · `Gestão de estado` ·
    `Disciplina assíncrona` · `Memória` · `Gatilhos de ativação
    (dojo-specific)`. (7/7)
  - `PERSONA.md`: 6× H2 = `Identidade & missão` · `Modos de operação
    (3 modos, time-boxed quando aplicável)` · `Workflow (por modo)` ·
    `Modelos mentais` · `Anti-padrões` · `Voz`. (6/6)
- [x] Conteúdo alinhado com fontes canônicas
  - **5 princípios invariantes** do `prompts/per_agent/seneca.md`
    ("Auto-escala por padrão", "SLA 24h para decisões consequentes",
    "Logar toda decisão", "Modo imediato para segurança/regressão/
    bloqueio", "Nunca silencie falha") — preservados em
    `Identidade & missão` (3×), `Disciplina de evidência` (1×),
    `Modos de operação` (5×) e `Anti-padrões` (4×).
  - **8 categorias de auto-escala** do `prompts/per_agent/seneca.md`:
    pedagógica de rotina, scheduling, métricas, reflexão, whiteboard,
    cron, mneme, mestre-conteúdo — operacionalizadas em tabela
    "Categorias canônicas" do `PERSONA.md` Modos de operação § Modo 1.
  - **9 decisões consequentes** da lista negra do
    `prompts/per_agent/seneca.md`: promover Skill, mudar pré-req,
    decisão arquitetural, reprovar 3×, pular unidade, adicionar nova
    unidade, mudar linguagem, ajustar quota Sócrates > ±20%, decisão
    de carreira — operacionalizadas em tabela "Lista negra" do
    `PERSONA.md` Modos § Modo 2 + "Decisões Consequentes" no
    `prompts/per_agent/seneca.md`.
  - **3 SLAs reduzidos (4h)** do `prompts/per_agent/seneca.md`:
    Skill com regressão detectada (rollback), bloqueio de produção,
    quebra de segurança (imediato) — operacionalizados em tabela
    "SLA reduzido" do `PERSONA.md` Modos § Modo 2.
  - **6 cenários de escalação imediata** do `prompts/per_agent/seneca.md`
    § "QUANDO ESCALAR IMEDIATAMENTE": Skill promoveu e métrica piorou,
    trilha libera unidade com pré-req quebrado, quota Sócrates zerada,
    Mnemosyne detecta inconsistência no whiteboard, Crítico detecta
    quebra de segurança, Maestro tenta avançar sem Promętor —
    operacionalizados em tabela "Cenários canônicos" do `PERSONA.md`
    Modos § Modo 3.
  - **Templates `sla_status.md` + ADR MADR** do
    `prompts/per_agent/seneca.md` § "SUA SAÍDA" reapresentados em
    `PERSONA.md` Workflow § PAUSA-checkpoint (passos 9–13) com
    YAML header canônico (`agente: seneca`, `sla_id`, `decisao`,
    `aberto_em`, `expira_em`, `default_se_expira`, `status`,
    `updated_by: Sêneca`, `updated_at`).
  - **Protocolo de 6 passos** do `prompts/per_agent/seneca.md` § "SEU
    PROTOCOLO" reapresentado em `PERSONA.md` Workflow § PAUSA-checkpoint.
  - **4 modos de invocação** do `14_seneca/README.md` preservados
    literalmente no `agent.md` "Disciplina assíncrona" + tabela de
    "Gatilhos de ativação" do `agent.md`.
  - **Contexto isolado** do `14_seneca/README.md` ("Read-only no
    whiteboard completo. Só escreve em `sla_status.md` + `decisions/`
    + `event_log`") operacionalizado em `agent.md` "Gestão de estado"
    (tabela de permissões de escrita) + "Isolamento de contexto"
    (lista de arquivos visíveis).
  - **Modelo opus** do `14_seneca/README.md` justificado
    explicitamente no `agent.md` linhas 11–17: "raciocínio
    contrafactual ('se eu errar, qual é o pior cenário?') que pede
    o tier mais forte. Sonnet/haiku não cabem aqui".
  - **5 thresholds da auditoria semanal** do `prompts/per_agent/seneca.md`
    § "AUDITORIA SEMANAL" (SLAs abertos > 48h, decisões sem ADR,
    decisões revertidas pelo aluno < 5%, auto-escala auditada 100%,
    modo imediato registrado) reapresentados em `PERSONA.md` Workflow
    § Auditoria semanal (passos 1–5).
  - **Opções conservadoras** da tabela § 3.3 de
    `07_governance_sla.md` (manter versioned, manter pré-req, manter
    decisão anterior, suspender trilha, não pular, não adicionar,
    não mudar, manter quota, re-abrir com Sonda nova) reapresentadas
    em `PERSONA.md` Modos § Modo 2 tabela "Lista negra".
  - **9 entradas RACI** do `01_agent_roster.md` § RACI (Sêneca
    aparece como `I` em "escolher próxima unidade", "Aprovar DoD",
    "Promover Skill", "Mudar currículo", "Decisão de arquitetura",
    "Reprovar unidade", "Encerrar trilha") preservadas em
    `agent.md` "Gatilhos de ativação" (cada linha cita o modo
    Sêneca correspondente).
- [x] Idioma pt-BR
  - Densidade pt-BR alta em ambos os arquivos: 99 hits de palavras
    pt-BR comuns (não/você/como/que/para/por) no `agent.md`; ainda
    mais alto no `PERSONA.md` (mais verbetes na Voz e Modelos mentais).
  - Resíduos em inglês são **termos canônicos** que aparecem assim
    em `00_IDEIAS.md` e em `prompts/per_agent/seneca.md` (`Skill`,
    `PR`, `pegadinha`, `AIDI`, `gate`, `whiteboard`, `ADR`, `MADR`,
    `SLA`, `rollback`, `HITL`, `MADR`, `default`, `commit`) e devem
    ficar em forma nativa (são domain terms, não vernáculo).

## Decisões editoriais (para o verifier)

1. **Estrutura 7+6 confirmada por `grep -c '^## '`**, não inferida: 7
   H2 no `agent.md` e 6 H2 no `PERSONA.md`. A seção **Classificação de
   ação (confiança × reversibilidade × impacto)** — que é o coração
   operacional de Sêneca — virou **H3 sub-seção** dentro de **Limites
   (não saia da raia)** do `agent.md`, com a framing "primeiro a regra
   negativa, depois o protocolo de calibragem". Isso preserva o
   padrão 7×H2 e mantém a triagem como peça central do papel, sem
   inflar a contagem de seções top-level.

2. **Modelo `opus` explícito e justificado** perto do topo do
   `agent.md` (linhas 11–17). A escolha **não** é decorativa: Sêneca
   tem **componente humano (HITL) + Opus copiloto** — o Opus faz o
   raciocínio contrafactual ("se eu errar, qual é o pior cenário?")
   que é a essência do papel. Sonnet/haiku **não** cabem (eles tratam
   o caso médio; governance exige o pior caso). Isso está coerente
   com o `14_seneca/README.md` ("Modelo sugerido: opus (decisão +
   auditoria)") e com o `00_IDEIAS.md` (linha 490: "[Humano + Opus
   copiloto]").

3. **Triagem `confiança × reversibilidade × impacto`** operacionalizada
   em **tabela canônica** (H3 do `agent.md` § "Limites") com 8 linhas
   cobrindo os quadrantes. É a **peça-âncora** do papel: cada decisão
   sua passa por essa triagem **antes** de virar auto-escala, SLA ou
   escalação imediata. O `prompts/per_agent/seneca.md` não dá a tabela
   explícita (apenas lista 9 SLA + 3 SLA reduzido); a tabela é uma
   síntese minha a partir do `prompts/per_agent/seneca.md` §
   "MODO AUTO-ESCALA" + "MODO PAUSA-CHECKPOINT" + "QUANDO ESCALAR
   IMEDIATAMENTE" e do `07_governance_sla.md` § 2–3.

4. **Separação de poderes explícita** (em 3 seções do `PERSONA.md`:
   `Identidade & missão` + `Modelos mentais` + `Voz`): "Você
   **autoriza** (vai ou não vai em SLA). Mnemosyne **materializa**
   (escreve no header YAML da Skill, no `learner_profile.md`, no
   `event_log/`). Ouroboros **propõe** (PR de Skill aberta)." Esta
   separação é a defesa contra o anti-padrão de Sêneca virar ditador
   de mudanças — e o `01_agent_roster.md` § RACI implica isso
   (Sêneca = `I` em "Promover Skill" — ela **autoriza**, não
   materializa).

5. **Default conservador como âncora** declarado em `Modelos mentais`
   e em `Modos de operação` § Modo 2: "Em qualquer impasse (Maestro
   quer promover, Crítico quer rollback, aluno ausente), o **default
   conservador vence** por default. Empate vai para a opção que
   reverte o estado atual." É a regra que **NUNCA** cede a
   "auto-escala por inércia" — sempre que há dúvida, o estado atual
   vence.

6. **SLA como contrato, não como castigo** declarado em `Modelos
   mentais`: "O SLA não é 'esperar 24h para ver se o aluno responde'.
   É um **compromisso de tempo limitado**: se não houver resposta em N
   horas, **aplique o default conservador** e siga. SLA cumprido =
   default aplicado = sistema continua. SLA estendido silenciosamente
   = governança fantasma = anti-padrão." Isso blinda contra o erro
   comum de tratar SLA como "espera passiva" em vez de "decisão
   time-boxed".

7. **Escalação imediata como cinto de segurança** declarada em
   `Modelos mentais`: "Aqui, Sêneca **EXECUTA** (rollback, bloquear,
   suspender, restaurar quota) — não só autoriza. É a única situação
   em que o portão humano vira **executor automático**, porque a
   janela de risco é pequena demais para abrir SLA." Distingue
   explicitamente de SLA (decisão + autorização) e de auto-escala
   (decisão + log).

8. **Atomicidade de log** (passo 6 do `Disciplina de evidência`):
   "1 SLA aberto = 1 linha em `event_log` + 1 entrada em
   `sla_status.md` (tabela 'Abertos'). Sem meia-escrita." Idem para
   SLA encerrado, escalação imediata, e auto-escala. Segue o padrão
   de Mnemosyne (1 evento = 1 linha NDJSON) e é o que permite a
   auditoria semanal contar autos do log (5° threshold:
   "Auto-escala auditada 100%").

9. **Caminho do repo corrigido**: `engines/minimaxDojo/agents/14_seneca/`,
   não `minimaxDojo/agents/14_seneca/`. A task tinha o caminho
   errado; ajustei para o caminho real, validado via `AGENTS.md` raiz
   (linha 12: "engines/minimaxDojo/ — tutoring-core dos 14 agentes
   (Maestro…Sêneca)") e via `ls -la` no diretório (já existia
   `14_seneca/README.md` de 15L). Mesmo ajuste feito pelas personas
   anteriores.

10. **4 modos de invocação** (do `14_seneca/README.md`) preservados
    literalmente como 4 bullets no `agent.md` § "Disciplina
    assíncrona": (1) Decisão consequente detectada (SLA 24h), (2)
    Auto-escala em ação reversível, (3) Auditoria semanal (cron,
    domingo), (4) Escalação imediata. E re-apresentados em tabela de
    19 linhas no § "Gatilhos de ativação (dojo-specific)" com origem
    + modo + ação.

11. **`audit_seneca-<YYYY-Wnn>.md`** introduzido como 4° arquivo
    gerado por Sêneca (além de `sla_status.md`, `decisions/ADR-*.md`,
    `event_log/`): relatório semanal do cron `02_cronos` com YAML
    header `cron_mode: auditoria_semanal` + 5 thresholds. Segue o
    padrão de Mnemosyne (`audit-<YYYY-MM>.md`) e de Crítico
    (`review.md`).

12. **Read-only enforcement explícito**: o `agent.md` § "Limites"
    tem a regra "NÃO modifica `learner/learner_profile.md` (papel da
    `12_mnemosyne`). Você tem **read-only** no whiteboard completo.
    Só escreve em `sla_status.md` + `decisions/` + `event_log/` +
    (eventualmente) `audit_seneca-*.md`." Reforça o `14_seneca/
    README.md` ("Acesso **read-only** ao whiteboard completo") e o
    `01_agent_roster.md` § 12 (Mnemosyne é a única com escrita
    ampla).

## Cobertura das fontes canônicas

| Fonte canônica | Como foi ancorada |
|---|---|
| `prompts/per_agent/seneca.md` (231L) | 5/5 princípios invariantes preservados em `Identidade & missão` + `Disciplina de evidência` + `Modos de operação` + `Anti-padrões`; 8 categorias de auto-escala em tabela "Categorias canônicas"; 9 decisões SLA em tabela "Lista negra"; 3 SLAs reduzidos (4h) em tabela "SLA reduzido"; 6 cenários de escalação imediata em tabela "Cenários canônicos"; templates `sla_status.md` + ADR MADR reapresentados em `Workflow § PAUSA-checkpoint` passos 9–13 com YAML header; protocolo de 6 passos reapresentado em `Workflow § PAUSA-checkpoint` passos 1–8; 4 passos do que **NÃO** fazer reapresentados em `Anti-padrões` (primeiros 4 bullets). |
| `engines/minimaxDojo/docs/07_governance_sla.md` (194L) | 9 decisões consequentes (lista negra § 3.1) operacionalizadas em `PERSONA.md` Modos § Modo 2 + tabela; 3 SLAs reduzidos (§ 3.4) em tabela "SLA reduzido"; opções conservadoras (§ 3.3) em coluna da tabela "Lista negra"; templates § 4 + § 5 reapresentados; modo aluno-responde-SLA (UX § 6) reapresentado no passo 7 do `Workflow § PAUSA-checkpoint`; quando escalar imediatamente (§ 7) reapresentado em `Modos § Modo 3`. |
| `engines/minimaxDojo/docs/01_agent_roster.md` § 14 (SÊNECA) | Missão, modelo (opus), vida (persistente), tools (decision-log, sla-tracker, audit), missão (auto-escala + PAUSA 24h + conservador + notifica + loga), saída (`decision_log.md` + `sla_status.md`) preservados em `Identidade & missão`; RACI § (Sêneca = `I` em 7 decisões) preservada em `Gatilhos de ativação` (cada linha cita o modo Sêneca). |
| `engines/minimaxDojo/agents/14_seneca/README.md` (15L) | 4 gatilhos de invocação (decisão consequente / auto-escala em reversível / auditoria semanal / escalação imediata) preservados literalmente; contexto isolado ("read-only no whiteboard completo. Só escreve em `sla_status.md` + `decisions/` + `event_log`") operacionalizado em `agent.md` § "Gestão de estado" (tabela de permissões de escrita) + § "Isolamento de contexto" (lista de arquivos visíveis); modelo opus justificado. |
| `docs/PROMPTS/00_IDEIAS.md` § SÊNECA (item 14 dos 14) | "Portão Humano no Loop" (linha 490) preservado no título do `PERSONA.md`; "[Humano + Opus copiloto]: autonomia calibrada por confiança × reversibilidade × impacto" (linha 490–492) virou a **tabela-âncora** § "Classificação de ação" no `agent.md`; "aprova Skills/mudanças de currículo; pausa-checkpoint-retomada com SLA time-boxed (auto-escala/auto-rejeita); loga toda intervenção" (linhas 491–492) operacionalizado em `Modos de operação` (3 modos) + `Workflow` (4 workflows) + `Disciplina de evidência` (3 destinos de log). |
| Padrão dos peers (Cartógrafo, Mneme, Mnemosyne, Promotor, Crítico, Atena, Galileu, Ouroboros, Sonda) | 7+6 seções; byte-identical Mavis↔engine; pt-BR pleno; paths canônicos do dojo; owner field + ISO timestamp; estrutura de isolamento de contexto (vê top-N, não arquivo inteiro); separação de poderes (Sêneca **autoriza**, Mnemosyne **materializa**, Ouroboros **propõe**). |

## Itens NÃO cobertos (escopo desta task)

- **`prompts/per_agent/seneca.md`** — canônico já existe em 231L e é
  referenciado. A task pediu apenas `agent.md` + `PERSONA.md` em Mavis
  e engine.
- **System prompt no Team Engine** — instanciação no Team Engine é
  responsabilidade do orquestrador (`mavis team plan`), não desta
  task.
- **Testes automatizados do agent** — fora de escopo; persona textual,
  sem código de produção.
- **`engines/minimaxDojo/INDEX.md` (atualizar índice)** — se houver
  índice central do motor, adicionar entry 14_seneca; tarefa
  independente, fora deste escopo.
- **Atualizar `01_agent_roster.md` § RACI** — a RACI já cita Sêneca
  como `I` em 7 decisões; não há mudança a fazer.

## Próximos passos (para o operator)

1. Reportar ao Maestro via handoff (`mavis communication send`) que
   Sêneca está pronto para invocação.
2. Verificar se há um `audit_seneca-000-template.md` a criar no
   `engines/minimaxDojo/whiteboard/` (segue o padrão de Mnemosyne
   `compact-000-template.md`).
3. Verificar se o `sla_status.md` já existe; se não, criar
   `sla_status.md` com tabela vazia (template no
   `prompts/per_agent/seneca.md` § "SUA SAÍDA").
4. Se o `02_cronos` (Cronos) ainda não tem o cron semanal
   `seneca-audit-weekly`, agendar.
