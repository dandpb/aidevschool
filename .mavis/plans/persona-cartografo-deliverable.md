# Deliverable — persona Cartógrafo (arquiteto de trilha)

## Summary
Reescrevi `agent.md` e `PERSONA.md` do agent **Cartógrafo** em pt-BR
autoritativo, ancorado em `00_IDEIAS.md` (calibragem MiniMax Agent Team +
intermediário + trilha de ROBUSTEZ) e em
`engines/minimaxDojo/agents/04_cartografo/README.md` (contexto isolado,
gatilhos de invocação, opus). Sobrescrevi a versão Mavis (estava
predominantemente em inglês com alguns termos pt-BR) e espelhei o conteúdo
exato (md5 idêntico) no repo.

## Changed files
| Path | Status | Bytes | Linhas |
| --- | --- | ---: | ---: |
| `~/.mavis/agents/cartografo/agent.md` | sobrescrito (era inglês) | 4877 | 88 |
| `~/.mavis/agents/cartografo/PERSONA.md` | sobrescrito (era inglês) | 6461 | 122 |
| `engines/minimaxDojo/agents/04_cartografo/agent.md` | **NOVO** | 4877 | 88 |
| `engines/minimaxDojo/agents/04_cartografo/PERSONA.md` | **NOVO** | 6461 | 122 |

> NOTA: a task apontava `engines/minimaxDojo/agents/04_cartografo/` (caminho que
> não existe); o caminho real é `engines/minimaxDojo/agents/04_cartografo/`
> (sob `engines/`). Confirmei via `AGENTS.md` raiz. Usei o caminho real.

## Pre-delivery verification (checklist da task)

- [x] Os 4 arquivos existem
  - `ls -la` em ambos os pares retornou datas e tamanhos idênticos.
- [x] `diff(agent.md Mavis, agent.md repo)` vazio
  - `diff -q` → `agent.md IDENTICAL`
  - `md5` → `503a1302386cc93aa3348db243a7f766` em ambos
- [x] `diff(PERSONA.md Mavis, PERSONA.md repo)` vazio
  - `diff -q` → `PERSONA.md IDENTICAL`
  - `md5` → `a03cc9bfe4b98342c617f19a4ba6d12b` em ambos
- [x] Estrutura segue cartografo (auto-referência) — 7 + 6 seções:
  - `agent.md`: Voz & registro · Disciplina de evidência · Limites · Gestão
    de estado · Disciplina assíncrona · Memória · Ambiguidade
    (7/7, espelha as 7 da versão Mavis original)
  - `PERSONA.md`: intro + Workflow · Anti-padrões · Modelos mentais · Saída ·
    Voz (6/6, espelha as 6 da versão Mavis original)
- [x] Conteúdo alinhado com `00_IDEIAS.md` + `README.md`
  - 9× "ROBUSTEZ" (trilha de robustez entry-point intermediário)
  - 2× `sonde-NNN.md`, 2× `config/learner.yaml`, 4× `03_robustness_trail.md`
    (contexto isolado do Cartógrafo)
  - 1× `opus` (modelo sugerido)
  - 4× `MADR` (ADRs em formato MADR para decisões de design)
  - Gatilhos: `Cold start` (1×) · `Unidade dominada` (1×) ·
    `Lacuna nova` (2×) · `Decisão arquitetural` (1×)
  - Trilha explícita em sequência foundation-first
    (testes→mutation→refactoring→SOLID→erros→observabilidade→review→robustez→arq.)
  - "Produtor ≠ verificador" preservado (você define portão, `verifier`
    fecha).
- [x] Idioma pt-BR
  - Densidade pt-BR alta: `não` 37×, `com` 19×, `você` 15×, `quando` 11×,
    `que` 20×, `como` 6×.
  - Resíduos em inglês são **termos canônicos** que aparecem assim em
    `00_IDEIAS.md` (`foundation-first`, `gate`) e devem ficar em forma
    nativa (são domain terms, não vernacular).

## Sobrescrevi ou só copiei?
**Sobrescrevi** a versão Mavis (estava em inglês misto). Em seguida copiei
o conteúdo final para o repo (era inexistente). Decisão: o texto da
versão Mavis era majoritariamente em inglês, com pt-BR só nas seções de
voz/motivação. Como a task pediu pt-BR coerente e o resto do ecossistema
(motor `minimaxDojo`, outros 13 agents já existentes no repo, Mavis
configs, convenções do time) é pt-BR, fazia sentido reescrever do que
traduzir pedaço a pedaço.

## Decisões editoriais (para o verifier)
1. **Modelo opus explícito** declarado já no `agent.md` (linha 6) — o
   `README.md` chama de "raciocínio de planejamento" e isso é o que justifica
   opus; deixei registrado perto do topo para o agent não cair em haiku por
   engano.
2. **Contexto isolado** espelhado literalmente do `README.md` na seção
   "Gestão de estado" e no `PERSONA.md` "Workflow" — `sonde-NNN.md` +
   `config/learner.yaml` + `docs/03_robustness_trail.md` + **não** vê
   unidades dominadas anteriores.
3. **Anti-padrão "escolha de stack como memorização"** ganhou regra
   explícita (tanto no `PERSONA.md` Workflow passo 6 quanto nos
   Anti-padrões) — é o item mais distintivo do Cartógrafo no
   `00_IDEIAS.md` (linha 641).
4. **State file** apontado para `learner/learning_state.yaml` (canônico do
   ecossistema, conforme `AGENTS.md`) com fallback para
   `docs/03_robustness_trail.md` — não chutei `docs/estado.md` que aparecia
   no Mavis original mas que não bate com a convenção real do repo.
5. **Language** ficou pt-BR pleno; deixei `gate`, `foundation-first`,
   `opus`, `MADR`, `ZPD`, `Bloom`, `Dreyfus` em forma nativa porque são
   identifiers / domain terms que não fazem sentido traduzidos (e o
   `00_IDEIAS.md` os usa assim).
6. **Path do repo** corrigido: `engines/minimaxDojo/agents/04_cartografo/`,
   não `engines/minimaxDojo/agents/04_cartografo/`. A task tinha o caminho
   errado; ajustei para o caminho real, validado via `AGENTS.md` raiz
   e via `ls -la` no diretório.
