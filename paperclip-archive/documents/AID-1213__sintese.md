<!-- issue: AID-1213 | key: sintese | doc_id: 2b1fb338-f377-4dd0-b9f9-eec5f3bc5f86 | updated: 2026-09-10 06:21:25.848+00 -->

# Síntese UX do piloto — top achados priorizados (LEARN AID-1213)

(AID-1213)

# Síntese UX do piloto — LEARN (AID-1213)

**Autor:** UX Designer de Aprendizagem (0bfa47c1) · **Data:** 2026-09-10
**Entradas:** relatório `measurement` da QA (AID-1212, doc `ec555b32`, janela 09-06→09-10, 57 envelopes, zero PII) + tracker do funil O1 (AID-909, doc `tracker`, hb13 04:53Z) + verificação first-hand dos templates/design docs existentes.
**Gate de honestidade:** cada achado cita a evidência (seção do relatório da QA ou linha do tracker). Nenhum achado sem evidência.

---

## 0. Veredito honesto (ler primeiro)

1. **A base quantitativa é minúscula** (n=6 sessões OS + 3 literacy, 2 instalações OS; relatório §8.1) e **a base qualitativa é vazia**: zero sessões de usabilidade executadas (tracker: Sessões concluídas = 0), zero canal de feedback nas superfícies live, e o único tráfego plausívelmente humano se concentra em 09-06/09-07 com correlação temporal sugerindo intros do founder nas 2 superfícies (§6). Esta síntese distingue o que é **observado**, o que é **hipótese** e o que está **confundido por ausência de tráfego**.
2. Mesmo assim, **um padrão domina a amostra e sobrevive à pequenez do n**: abandono ANTES da 1ª atividade, sem nenhum evento de erro (0/57, §7) — fricção de ativação/clareza, não falha técnica.
3. O funil O1 segue **0/0/0/0/0** à espera da lista de intros do founder (tracker hb12/hb13; card `9fd50b19`/AID-1113). Ou seja: LEARN hoje roda sobre tráfego adjacente ao founder; **as sessões O1 (AID-641) continuam sendo o caminho desbloqueador de evidência qualitativa** — nada desta síntese substitui esse plano.

## 1. Achados priorizados (top 5)

### F1 — Abandono antes da 1ª atividade é o gargalo dominante de ativação
- **Prioridade:** P1 (maior impacto imediato no aprendiz; afeta a porta de entrada de tudo).
- **Evidência:** relatório §5 e §9.1 — 4/6 starts OS sem NENHUMA submissão de atividade (2 abandonaram `l02` <1 min após `mission.started`; 1 abandonou `game-02-warehouse` sem evento seguinte; §5 drop-off `game-02-warehouse` 100%, `l02` OS 67%); literacy idem (`75d40e87`: `lesson_started` l02 e nada mais, Anexo A). Zero eventos de erro em 57 envelopes (§7) → **não é falha técnica**.
- **Hipótese de causa (a validar em sessão, não confirmada):** a transmissão missão→brief→1ª atividade impõe carga cognitiva alta antes do primeiro valor: o aprendiz precisa entender a missão E entender o que conta como submissão antes de qualquer feedback. Primeira atividade do tipo `output_comparison` pode exigir leitura/comparação demais para um primeiro toque. Sem eventos no entre-missões (F2), não sabemos distinguir "leu o brief e saiu" de "não entendeu o que fazer".
- **Impacto no aprendiz:** quem não passa da 1ª atividade nunca experimenta o loop que comprovadamente funciona (F4).

### F2 — Cegueira de medição na entrada e no entre-missões
- **Prioridade:** P2 (maior alavancagem para o próprio loop LEARN; sem isso, F1 não é diagnosticável).
- **Evidência:** relatório §4 (2/3 sessões literacy começam em `lesson_started` sem `entry_viewed` — deep-link não emite evento de entrada); §8.4 (funil onboarding do OS só é visível na 1ª visita da instalação — retornos entram por `journey.returned` e achatam o funil); §9.4 (o trecho entre `mission.started` e a 1ª atividade é invisível — dwell no brief, scroll, exposição à 1ª atividade sem submissão).
- **Hipótese de causa:** o vocabulário de eventos foi desenhado para o ciclo tentativa-feedback-progresso (que funciona, F4), não para o funil de ativação; entrada por deep-link e telas intermediárias ficaram fora do envelope.
- **Impacto:** cada rodada de MEASURE futura subestima entrada e não explica abandono → decisões de produto às cegas exatamente no gargalo F1.

### F3 — Não existe superfície de retorno/hábito no piloto (e recursão = 0)
- **Prioridade:** P3 (impacto alto no longo prazo; **confundido** por ausência de tráfego — ver veredito).
- **Evidência:** relatório §0.2/§8.2 — zero envelopes em 09-08/09-09/09-10, nenhuma sessão em dias consecutivos; ADR existente `docs/design/spaced-repetition-streak/README.md` (verificado first-hand no workspace) está **Proposed** — a camada streak/revisão espaçada NÃO está implementada nas superfícies promovidas; tracker: funil O1 0/0/0/0/0 (sem aprendizes externos recorrentes por design do rollout, não por recusa do produto).
- **Hipótese de causa:** o piloto ainda não tem aprendizes recorrentes (funil não abriu), MAS o produto também não oferece gatilho de retorno (sem streak visível, sem next-review, sem "volte amanhã") — quando os intros chegarem, a ausência da superfície vai limitar a formação de hábito desde o dia 1.
- **Impacto:** ritmo Duolingo-like (missão da escola) depende de retorno; sem superfície de retorno nem métrica CURR-análoga, o piloto mede só ativação.

### F4 — Sinal positivo a PROTEGER: quem passa da 1ª atividade conclui com verificação PASS
- **Prioridade:** manter (não é problema; é restrição de design para os fixes de F1-F3).
- **Evidência:** relatório §5/§9.3 — 2/2 jornadas que passaram da 1ª atividade completaram (OS: 3 atividades, todas PASS na 1ª submissão, ciclo `validating→pending→verified` íntegro; literacy: 130s/316s, score 1); zero erros (§7).
- **Leitura:** o core pedagógico tentativa→feedback→progresso funciona E2E nas 2 superfícies. Qualquer mudança de ativação (F1) deve preservar este ciclo intacto.

### F5 — Observação geradora de hipótese: pulo de trilha/missão antes de engajar
- **Prioridade:** P4 (amostra ínfima; não vira intent ainda — fica registrada para as sessões O1).
- **Evidência:** Anexo A — sessão OS `bce4f331`: `onboarding.completed` → `mission.started` l02 (ai-prática) → `mission.started` game-02-warehouse (dev) → fim, sem submissão em nenhuma.
- **Hipótese de causa:** seleção de trilha/missão pode não comunicar "comece aqui" com clareza suficiente; ou o aprendiz testa duas portas e nenhuma o retém (sobreposição com F1).
- **Impacto:** se confirmada nas sessões, aponta para fricção na jornada pós-onboarding (meu primeiro mandato: track selection).

## 2. Encaminhamento

- **3 maiores problemas → drafts de intent** (doc `intent-drafts` neste issue, formato `docs/sdlc/templates/intent.md`, status `draft`): F1 (ativação pré-1ª-atividade), F2 (instrumentação entrada/entre-missões), F3 (loop de retorno/hábito).
- **F4** vira constraint explícita nos três drafts (preservar o ciclo verificado).
- **F5** fica como pergunta aberta no draft de F1 e alvo das sessões O1 (AID-641).
- **Nada é commitado no repo** — aceite de intent é gate do product owner (founder/CEO) + triagem do SM (AID-1215).

## 3. Limitações desta síntese

1. n=6+3 sessões interativas (2 instalações OS); tier de classificação de tráfego parcialmente inferencial (relatório §2, nota de honestidade).
2. Zero evidência qualitativa de aprendiz real externo; correlação temporal sugere founder nas 2 superfícies (§6) — risco de o "aprendiz" medido ser o próprio time.
3. Janela declarada até 09-10 mas dados terminam 09-07 11:55Z (§8.6).
4. Recomendações de UX aqui são hipóteses priorizadas por evidência comportamental agregada; **não substituem** as sessões moderadas O1 — são o insumo para os roteiros delas.
