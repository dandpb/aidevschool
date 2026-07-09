# ADR-0003: AIDI (AI Dependency Index) needs a canonical source

- **Status:** Accepted
- **Date:** 2026-07-08
- **Decisor:** Daniel (via `architecture-weed` loop, this run)
- **Principles cited:** F2 (uma fonte da verdade, muitas views derivadas), F3 (produtor ≠ verificador, afirmação exige evidência), F5 (fatia vertical antes de escala), F7 (falha visível por padrão), F8 (simplicidade)

## Contexto

AIDI (AI Dependency Index) mede o quanto o aprendiz depende de IA — e a própria meta do aprendiz
em `learner/learning_state.yaml:6` é literalmente "robust professional-quality code without AI
dependency", então a métrica mede o objetivo declarado do ecossistema. Hoje **três views derivadas
mostram três valores diferentes (0.34 / 0.5 / 0.0), mais um seed histórico (0.50 no event-log)**,
e a fonte canônica declarada (`learning_state.yaml`) nem contém o campo `aidi`: o dashboard cai
para um fallback `0.34` com uma trendline sintética, o whiteboard hardcodeia `0.5` num adapter
enquanto o cabeçalho afirma derivação, e um seed congelado mostra `0.0`. (Evidência com file:line
abaixo.)

Isso viola F2 diretamente — o caso exato que o princípio existe para eliminar — com um ângulo de
F3/F7: o dashboard apresenta uma trendline sintética como histórico medido, e o `profile.yaml`
declara derivação de uma fonte que não tem o campo. (Mais nítida em HEAD do que no audit: 3 valores
distintos + seed, não 2.)

## Opções

| Opção | Complexidade | Custo agora | Familiaridade | Reversibilidade |
| --- | --- | --- | --- | --- |
| **A. Campo canônico em `learning_state.yaml` (escolhida)** — adicionar bloco `learner.aidi` (`current`, `threshold_amber`, `threshold_red`); dashboard já lê (`:201`); whiteboard deriva dele; aposentar a trendline sintética e os hardcodes 0.5/0.0 | Baixa | 1 campo YAML + 2 pequenas mudanças de adapter | Alta (espelha como `dreyfus`/`bloom` já fluem) | Alta (remover o campo + reverter adapters) |
| **B. AIDI computado do event-log** — adapter do substrate computa AIDI a partir de `event_log/*.ndjson` (eventos de assistência de IA) e projeta nas duas views | Alta | pipeline de gravação de eventos + adapter de computação | Média | Média (novo contrato de evento) |
| **C. Adiar: ocultar AIDI até ter fonte real** — parar de exibir a trendline sintética 0.34 | Baixa | remover 1 painel do dashboard | Alta | Alta | 

## Decisão

**Opção A.** `learner/learning_state.yaml` passa a deter o AIDI canônico como um bloco
`learner.aidi` (`current`, `threshold_amber`, `threshold_red`, `measurement_source`). O dashboard
já lê esse caminho — só falta o campo existir; o adapter do whiteboard passa a derivar do campo em
vez de hardcodear; e a trendline sintética do dashboard deixa de ser apresentada como medição
(`measurement_source` honesto no `current`). O seed congelado e o `event_log` deixam de ser fonte — passam a histórico. O valor
`current` inicial é auto-reportado pelo aprendiz no journal, não um número inventado. A Opção C
(ocultar) foi rejeitada: não resolve F2 — o próximo consumidor de AIDI recria a divergência.

A Opção B (computado por evento) é o destino de longo prazo, mas F5 proíbe o pipeline de eventos
antes do dono canônico — ver **revisitar-quando** abaixo.

## Consequências

**Fica mais fácil:**
- Qualquer view que mostra AIDI tem um lugar para ler; a classe de bug F2 fecha para esta métrica.
- A provenance do número deixa de ser falsa: `profile.yaml` só poderá dizer "derived from
  learning_state.yaml" quando de fato derivar.
- `validate()` pode ganhar um invariant futuro sobre `learner.aidi.current ∈ [0,1]` (fecho com o
  audit item #9, F7).

**Fica mais difícil:**
- Todo estado de learner agora carrega um campo a mais que precisa ser mantido honesto (F3/F7): o
  valor `current` tem que ter um `measurement_source` ou vira a próxima masterização-semeada.
- Adicionar o campo exige rodar `python3 -m learner.substrate` para regenerar views (disciplina F2).

**Revisitar quando:**
- Existir um pipeline real de gravação de eventos de assistência de IA → supersede por uma ADR
  "AIDI computado por evento" (Opção B), mantendo `learning_state.yaml` como o lugar do `current`
  mas mudando `measurement_source: event_computed` e o adapter que o alimenta.
- Um novo consumidor de AIDI surgir → ele lê do substrate snapshot ou do `learning_state.yaml`
  diretamente; nunca cria um terceiro hardcode.

## Evidência

- Audit item #5 (`docs/TECH_DEBT_AUDIT_2026-07-08.md:19`) já tinha o desacordo; este run confirmou
  e acrescentou os seeds 0.0 e 0.50. File:line:
- `learner/learning_state.yaml:3-20` — bloco `learner:` sem campo `aidi` (fonte canônica declarada,
  via `engines/codexDojo/ecosystem/MANIFEST.md` seam "Learner substrate").
- `learner/substrate/dashboard_snapshot.py:201` (`aidi_cfg = learner.get("aidi", {})`),
  `:207` e `:237` (`float(aidi_cfg.get("current", 0.34))` → 0.34), `:114-134` + `:206-212`
  (trendline sintética), `:117-118` (docstring admitindo ausência de entradas no journal).
- `learner/substrate/adapters/whiteboard.py:42` (`"ai_dependency_index": 0.50` hardcode).
- `learner/substrate/__init__.py:279-280` (sync regenera `profile.yaml` via
  `derive_whiteboard_profile`).
- `engines/minimaxDojo/whiteboard/profile.yaml:16` (`ai_dependency_index: 0.5` + cabeçalho falso de
  derivação).
- `engines/minimaxDojo/whiteboard/learner_profile/profile.yaml:18` (`ai_dependency_index: 0.0`,
  seed congelado, não regenerado pelo sync).
- `engines/minimaxDojo/whiteboard/event_log/events-2025-W00.ndjson:2` (`aidi:0.50`).
- `docs/FUNDAMENTOS.md` F2 (princípio), F3/F7 (ângulos de afirmação-sem-evidência e falha visível).
