<!-- issue: AID-1223 | key: input-ux | doc_id: 848b8900-bf82-4635-a5e4-19744e42e1bb | updated: 2026-09-10 08:11:27.642+00 -->

# Input UX — 3 perguntas §4 da spec F2 (rev 80c8e23b)

(AID-1223)

# Input UX — AID-1223 → spec AID-1218 rev `80c8e23b` §4

**Veículo:** sub-issue AID-1223 (criada pelo System Designer em HB1 — wake direto bloqueado pela plataforma). **Autor:** UX Designer (0bfa47c1), autor do Draft 2 `2026-09-10-entry-brief-instrumentation` (AID-1213 doc `intent-drafts` rev `54c02e18`).
**Nota de entrega:** comentário direto e anotação na AID-1218 foram recusados pela fronteira de autorização (`Issue is outside this actor's authorization boundary`); o texto abaixo é o input integral para o lead (SD) relayer no thread da AID-1218 antes do `request_confirmation` do owner.

---

**INPUT UX (AID-1223) — resposta às 3 perguntas da spec §4** (UX Designer, autor do Draft 2 `2026-09-10-entry-brief-instrumentation`, AID-1213 doc `intent-drafts` rev `54c02e18`). Respondido contra a spec **rev `80c8e23b`** com verificação first-hand no clone do main.

## Q1 — Rótulos da segmentação (R3): SIM, atendem o vocabulário F1, com 2 ressalvas de glossário

O diagnóstico de F1 (Draft 1, AID-1213: distinguir "leu o brief e saiu" × "não entendeu o que fazer" × "nunca viu a 1ª atividade") fica coberto:

- **"saiu no brief"** = `started ∧ brief_viewed ∧ ¬activity_presented` ↔ F1 "nunca viu a 1ª atividade" ✔
- **"saiu na 1ª atividade"** = `activity_presented`(índice 0) `∧ ¬1ª submissão` ↔ F1 "viu a atividade e não submeteu" ✔
- O 3º estado F1 (≥1 submissão) já é medido pelos eventos existentes.

Ressalvas (glossário do relatório, sem mudar definições):

1. **Exposição ≠ leitura.** `brief_viewed` mede render (exposição). O gloss do report v4 deve ser "viu o brief e não chegou à 1ª atividade" — nunca "leu o brief e saiu"; leitura/compreensão é hipótese, separada pelos bins de dwell e pelas sessões O1, não pelo rótulo. Idem "saiu na 1ª atividade": não glosar como "não entendeu o que fazer" — essa é exatamente a hipótese F1 que os eventos + O1 vão testar; o rótulo mede comportamento.
2. **Resíduo `started ∧ ¬brief_viewed`:** as categorias são exaustivas exceto esse resíduo (esperado ~0 — a intro renderiza junto com o started). Recomendo o report v4 declará-lo como nota de qualidade de dados (canário de defeito de emissão se crescer), não como segmento de aprendiz.

**A intro da lição É o "brief" na visão do aprendiz (missão hospedada no OS): SIM, verificado.** `LessonScreen.tsx:216` fase `"intro"` renderiza exatamente o framing de missão: eyebrow `MISSÃO DA VILA · {módulo}` (`:229`), card **"Pedido da Vila Lume"** (`:238` — o pedido é o brief), objetivo, ciclo Entender→Escolher→Conferir→Aplicar, CTA **"Começar missão"** (`:279`). Em missão hospedada não há tela de brief do host antes dessa intro — ela é o único momento brief-like antes da 1ª atividade; o espelho `lesson_brief_viewed`↔`mission.brief_viewed` é coerente. Nota de divergência controlada: "brief" é vocabulário de analista — o aprendiz nunca vê essa palavra; nos artefatos de pesquisa O1 (scorecard AID-641/roteiro), referir a tela pelo nome visível ("Pedido da Vila Lume"), com o mapeamento declarado no relatório.

## Q2 — Bins de dwell {<15s, 15-60s, 1-5min, >5min}: SIM para o 1º corte

1. **Cobrem a linha de base** (AID-1212 §5): abandonos "<1min após mission.started" caem em 15-60s; conclusões de 130s/316s caem em 1-5min/>5min — os bins separam os dois regimes observados.
2. **A granularidade fina vive nas sessões moderadas, não no analytics**: o scorecard O1 (AID-641 §3) mede tempo contínuo por lição e tentativas por atividade; o papel dos bins é comparável direcional, e a regra AID-909 (analytics ≠ evidência O1) proíbe tratar o bin como medida do participante.
3. **n minúsculo + k≥5**: mais bins agora só multiplicam células suprimidas (§5 da spec) sem ganho de decisão.

Nota de uso (sem mudança de spec): os intervalos diagnósticos de F1 são o **(b) brief→1ª apresentação** e o **(c) apresentação→1ª submissão**; o (a) started→brief será ~100% <15s por construção. Sugestão aditiva opcional (decisão SD/QA): se o report publicar também a **mediana contínua** de (b) e (c) por segmento nas seções novas, fica diretamente comparável com o tempo contínuo do scorecard O1.

## Q3 — Prop `entry` ∈ {home, lesson-resume, onboarding}: conjunto correto; aposentar "deep-link"

Verificado first-hand: `resumeSession()` (`useCases.ts:260-268`) retorna exatamente 3 destinos — `{kind:"onboarding"}` (onboarding pendente), `{kind:"lesson"}` (lição `in_progress` → player direto, consumido em `App.tsx:58-67`) e `{kind:"home"}`. A taxonomia proposta mapeia **1:1** com o mecanismo real. "Deep-link" (relatório §4/§8.4 e meu próprio Draft 2) era rótulo de hipótese do analista para o gap — o literacy app usa roteamento por estado (sem URL por lição), então deep-link no sentido próprio nem existe; o mecanismo verificado é retomada pós-reload. Recomendações:

1. Adotar {`home`,`lesson-resume`,`onboarding`} como na R1 — `lesson-resume` inclusive ecoa o comentário do próprio código ("Ponto de retomada após reload").
2. Uma linha de glossário no report v4: "`lesson-resume` = retomada pós-reload de lição em andamento (chamado de 'deep-link' no relatório da janela 09-06→09-10)" — mantém as séries cross-referenciáveis sem reescrever história.
3. Prop ausente em envelopes pré-v4 deve ser lido como "não instrumentado (pré-v4)", não "unknown" — senão a série antiga parece ruído de dado.

## Veredito

Nenhuma divergência que exija mudar §1/§3 da spec; as ressalvas acima são aditivas e de glossário/relatório. Do ponto de vista UX, a spec rev `80c8e23b` está prata para o `request_confirmation` do owner.

Input entregue via AID-1223 (colaboração obrigatória AID-1216/B1). Nada de código tocado; gates permanecem com o lead (System Designer) e o owner.
