# Roadmap — completar o curso e virar workflow permanente

**Objetivo:** percorrer, em ordem, **todos os módulos e passos já implementados**
em `index.html` e `workflow-exemplo/`, com prova de conclusão em cada fase.

**Perfil usado:** sessões de 25–40 min, ~5 h/semana (perfil do learner) →
**4 semanas + o gate que vale**.

**Como usar:**
1. Marque os checkboxes neste arquivo (ele é o seu tracker — versione os avanços).
2. Um gate só conta como completo **com evidência anexada** (saída de comando,
   arquivo produzido, data).
3. Ao fim de cada fase: responda as 5 perguntas do Módulo 9 e promova
   **exatamente um** ativo.
4. Evidências sugeridas em `docs/curso-simples/progresso/` (crie ao avançar).

## Regras do roadmap

1. **Uma fase por semana.** Se estourar, corte o escopo da fase — não expanda a
   semana (F5/F8).
2. **Gate sem evidência não está completo** (F3/F6). “Li o módulo” não é gate;
   “exercício feito e arquivado” é.
3. **Não criar estrutura nova enquanto percorre** — sem engines, ADRs ou agentes
   “já que estou aqui”. O roadmap é de conclusão, não de expansão.
4. **Checkpoint final (Fase 6):** com uma fatia vertical provada e um aluno
   real, reavaliar a estrutura maior (engines/substrate/OS) — retomar, congelar
   ou cortar, com justificativa escrita.

---

## Fase 0 — Reproduzir antes de estudar (Dia 1 · 1 sessão de 40 min)

- [ ] Rodar a suíte do exemplo: `python3 -m pytest test_release_notes.py -q` → **22 passed**
- [ ] Rodar o CLI: `python3 release_notes.py demo_commits.json --version v2026.08`
- [ ] Ler os artefatos na ordem: `PRD → SPEC → CONTEXTO → PLAN → VALIDACAO` (15 min)
- [ ] Aplicar no **seu** repo: gerar `meus_commits.json` a partir do `git log` e rodar o CLI
- [ ] Revisar a seção “Fora do padrão” da sua saída: quais commits a equipe (ou
      agentes) escrevem fora do padrão? Decidir: padronizar ou aceitar a seção.

**Gate:** colar as duas saídas (demo + seu repo) em
`progresso/00-reproducao.md` com a data.

---

## Fase 1 — Comunicação com o modelo (Módulos 1–3 · Semana 1 · 3 sessões)

- [ ] **M1** ler §1.1–1.5 · ✏️ pedir “corrija o bug do rate limiter” em conversa
      nova **sem anexar nada**; anotar o que o modelo inventa; repetir com o
      código + teste falhando anexados; registrar a diferença em 3 linhas.
- [ ] **M2** ler §2.1–2.4 · ✏️ responder por escrito as 4 perguntas do seu
      harness: (1) arquivo de regras lido no início? (2) onde ficam permissões?
      (3) como alterna plan/build? (4) onde vive a memória entre sessões?
- [ ] **M3** ler §3.1–3.4 · ✏️ reescrever o seu último pedido real nos 5 campos
      (CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META); contar quantas decisões
      estavam implícitas no original.

**Gate:** o pedido de 5 campos arquivado em
`progresso/01-pedido-5-campos.md` — ele vira o seu template de pedido (ativo).

---

## Fase 2 — Contexto e contrato (Módulos 4–5 · Semana 1–2 · 2–3 sessões)

- [ ] **M4** ler §4.1–4.4 · ✏️ escrever `CONTEXTO.md` (tabelas incluído/excluído
      **com o porquê**) para a próxima tarefa real, antes de abrir o chat.
- [ ] **M5** ler §5.1–5.4 · ✏️ escolher **uma feature pequena sua**; escrever
      PRD + spec em ≤ 30 min; pedir a implementação anexando os dois; medir:
      quantas perguntas o modelo deixou de fazer? quantas decisões deixaram de
      ser surpresa no diff?

**Gate:** `PRD.md` + `SPEC.md` + `CONTEXTO.md` versionados da feature real —
**esta feature entra na Fase 3**.

---

## Fase 3 — Execução e agentes (Módulos 6–7 · Semana 2 · 3 sessões)

- [ ] **M6** ler §6.1–6.3 · ✏️ parte 1: abrir a feature da Fase 2 em **Plan Mode
      sem edição**; aprovar o plano **por escrito** (responder com o plano
      aprovado antes de liberar o build).
- [ ] **M6** ✏️ parte 2: implementar em fatias de ~100 linhas de diff, testes
      primeiro (RED → GREEN); contar quantas vezes foi preciso dizer “não era
      isso” — comparar com o seu histórico.
- [ ] **M6** ✏️ parte 3: validação em camadas + aceite no comportamento real;
      escrever `VALIDACAO.md` com as saídas coladas.
- [ ] **M7** ler §7.1–7.4 · ✏️ em sessão **nova** (contexto fresco), rodar o
      prompt de verificador do curso contra a spec da feature; anotar os
      findings que a sessão produtora nunca mencionou.

**Gate:** feature com RED→GREEN + `VALIDACAO.md` + findings do verificador
arquivados em `progresso/03-verificador.md` (se zero findings: investigar se a
spec ou o verificador está fraco).

---

## Fase 4 — Extensão e loop (Módulos 8–9 · Semana 3 · 2 sessões)

- [ ] **M8** ler §8.1–8.4 · ✏️ olhar as últimas 2 semanas de conversa com IA;
      achar um procedimento explicado mais de uma vez; escrevê-lo como skill
      (gatilho + passos + **uma armadilha real já paga**); versionar.
- [ ] **M9** ler §9.1–9.4 · ✏️ ao fechar a feature da Fase 3: responder as 5
      perguntas de promoção e promover **exatamente um** ativo (nem dois, nem
      zero), com data e gatilho registrados.

**Gate:** 1 skill versionada + 1 ativo promovido, listados em
`progresso/04-ativos.md`.

---

## Fase 5 — Passo a passo final: as 4 capacidades (Semana 3–4 · 4 sessões)

- [ ] **C1 · Previsibilidade:** uma feature nova com a sequência completa
      (fatia pequena → PRD/spec/contexto → plano aprovado por escrito → fatias
      → validação em camadas → promoção), preenchendo a Definition of Done do
      curso item a item.
- [ ] **C2 · Modelos diferentes:** rodar a **mesma spec** de uma tarefa pequena
      em **dois modelos diferentes**; comparar os diffs contra os mesmos
      critérios de aceite; registrar se “pronto” mudou com o modelo (se mudou,
      o processo ainda mora no chat — corrigir a spec).
- [ ] **C3 · Agentes especializados:** extrair o primeiro par
      produtor/verificador para arquivos de papel (pode fazer / deve entregar /
      nunca faz); usar o par na feature seguinte.
- [ ] **C4 · Ativos permanentes:** revisar as últimas 2 semanas; promover
      repetições (spec→template · prompt→regra · checklist→skill · erro→teste);
      confirmar que **cada ativo foi usado** na feature seguinte (ativo não
      usado é doc).

**Gate:** quatro evidências (uma por capacidade) em
`progresso/05-capacidades.md`.

---

## Fase 6 — O gate que vale (Semana 4+)

- [ ] Entregar o curso (`index.html`) + o workflow-exemplo para **uma pessoa
      real** (seus alunos) usar sem você do lado.
- [ ] Perguntar, não supor: completou? voltou na semana seguinte? o que
      quebrou?
- [ ] Registrar as respostas e promover os aprendizados (patch no HTML conta
      como promoção).
- [ ] **Checkpoint de decisão:** com fatia vertical provada + aluno real,
      reavaliar a estrutura maior do repo (engines, substrate, OS): retomar,
      congelar ou cortar — com justificativa escrita em
      `progresso/06-decisao-estrutura.md`.

**Gate:** respostas datadas em `progresso/06-gate-externo.md`.

---

## Acompanhamento

| Fase | Semana | Gate (prova) | Status | Data |
| --- | --- | --- | --- | --- |
| 0 | 1 | saídas demo + seu repo | ⬜ | |
| 1 | 1 | template de pedido 5 campos | ⬜ | |
| 2 | 1–2 | PRD+SPEC+CONTEXTO da feature real | ⬜ | |
| 3 | 2 | RED→GREEN + verificador fresco | ⬜ | |
| 4 | 3 | 1 skill + 1 ativo promovido | ⬜ | |
| 5 | 3–4 | 4 evidências de capacidades | ⬜ | |
| 6 | 4+ | aluno real + decisão de estrutura | ⬜ | |

> Regra da casa: este roadmap também é um contrato — cada linha tem um gate.
> Se uma fase não tiver prova, ela não aconteceu; e está tudo bem refazer,
> desde que visível.
