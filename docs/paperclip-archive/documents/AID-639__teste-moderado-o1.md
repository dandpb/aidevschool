<!-- issue: AID-639 | key: teste-moderado-o1 | doc_id: 1fa8d18d-120c-44de-84a5-0b5f70effe6f | updated: 2026-09-02 13:19:34.618+00 -->

# AID-639 — Doc 1/3: Kit de teste moderado onda O1 (l27–l29) — roteiro, tarefas, critérios, amostra, recrutamento

(AID-639)

# AID-639 — Doc 1/3: Kit de teste moderado da onda O1 (l27–l29)

**Status:** KIT PRONTO para execução (aguarda QA GO AID-631 + recrutamento; execução como issue filha). Zero escrita canônica; zero produção de código/lições; nenhum `mastered`; analytics ≠ evidência.
**Owner:** UX Designer de Aprendizagem (0bfa47c1). Mandato: AID-639 (entrega 1). Instrumento = teste moderado formative — a eficácia pedagógica NÃO é presumida (spec AID-610 §7/§8.4; proposta AID-558 §3.6/§7.4).
**Superfície sob teste (verificada first-hand em `origin/main` @ `7a4e5df` = pós-registro da promoção):** produção vigente pin `7653822` (alias `aidevschool-codexdojo-os.netlify.app`), missões hospedadas na rota `/mission/dev/l27|l28|l29` (track `dev`, chapterOrder 14/15/16, runtime `literacyDojo` hosted iframe same-origin, `contentVersion "2026-09-02.2"`, evidência `literacy-evidence` v1 `verifierRequired: true`, fallback DOM). Smoke Playwright completa l27 hospedada ponta-a-ponta (`chapter-continuity.smoke.spec.ts:419`) — o caminho do learner funciona; o teste mede o que a máquina não mede.
**Precedentes de método:** protocolo AID-142 (roteiro, pré/pós, sem PII, sem coletar respostas de exercício, artefato revisado antes de convidar), coorte AID-180/AID-348 (n=2, CONTINUAR, "poder estatístico nulo"), critérios observáveis AID-524 §5.3 (formative, n≥5, checklist falsificável).

---

## 1. O que este teste responde (e o que não responde)

| Pergunta | Instrumento | Status |
| --- | --- | --- |
| Devs concluem l27–l29 sem quebra de expectativa? Onde travam, onde pedem dica, o que confunde? | **Este kit** (observação moderada) | n=5–8, direcional |
| O comportamento ensinado **transfere** para um cenário novo (não o da lição)? | **Este kit** (tarefas de transferência §4) | n=5–8, direcional |
| A onda O1 "funciona" no agregado (demanda dev, conclusão por trilha, retorno D+1/7/21)? | Funil OP-B (Doc 2 `funil-op-b`) | escuro até ativação |
| Integridade/a11y formal das missões | QA Lead AID-631 (Gate B) | em andamento |

**Não responde:** eficácia populacional (amostra formative), mastery (proibido; gates intocados), nem priorização de l30+ sozinho — a sequência de evidência está no Doc 3 `sequencia-evidencia`.

## 2. Sequenciamento e pré-condições

1. **QA GO AID-631 antes do primeiro participante** (produtor ≠ verificador; não testar learners em superfície sem GO wave-level — a matriz os-* está `stale` desde T1/PR #242 e o re-grant pertence à QA).
2. Superfície congelada durante as sessões: produção `7653822` **ou o pin vigente no dia** (anotar deploy id no scorecard; se houver re-pin entre sessões, registrar e re-executar 1 sessão de sanity no novo pin).
3. Sessão remota, 45–60 min, screen+áudio com consentimento explícito; sem câmera obrigatória; participante pode parar a qualquer momento.

## 3. Roteiro da sessão (moderador: UX; 45–60 min)

**A. Abertura (5 min)** — consentimento (gravação, anotação anonimizada, LGPD; sem coleta de respostas de exercício além do que a tela já mostra); permissão para pensar em voz alta; "não há jeito errado de usar; o teste é do produto, não seu".

**B. Pré-entrevista (5 min)** — perfil: papel (dev profissional / dev em transição / adjacente), tempo usando assistentes de IA (frequência), já conhecia o AiDevSchool (qual trilha até onde). Nada além disso — sem PII.

**C. Aquecimento de navegação (5 min, observacional)** — "chegue à lição sobre debug com assistente". Observar SEM ajudar: como encontra a trilha dev no mapa; o nome do módulo mod-05 ("contexto e decisão") ajuda ou atrapalha com 9 lições acumuladas (flag RD6 da spec — registrar citação literal se houver confusão); expectativa de sequência após l23.

**D. Missões + transferências (25–35 min)** — ver tarefas §4. Ordem fixa l27 → l28 → l29 (ordem canônica da onda). Intervenção do moderador apenas em: bloqueio técnico real (registrado como incidente) ou pedido explícito do participante (registrado). Dicas do produto são permitidas e contadas.

**E. Pós-entrevista (5 min)** — (1) "no seu trabalho real, o que você usaria amanhã?"; (2) "o que veio depois de l29?" (prova da moldura "porta de entrada" divulgada na AID-610 — o fecho promete continuidade; medir se a expectativa fica em aberto de forma motivadora ou frustrante); (3) nota 1–5 de confiança para aplicar cada comportamento (auto-relato = preferência declarada, rotulada como tal); (4) o que faltou.

**F. Fechamento** — agradecimento; avisar que resultados anonimizados alimentam decisões de conteúdo; reforçar que nada ali avalia a pessoa.

**Captura por participante (checklist ADR-0004-style, falsificável):** tempos por missão; tentativas por atividade (a1/a2/a3 de cada lição); dicas abertas; incidentes técnicos; citações literais de confusão; observações de teclado/`aria-live`/reflow se o participante navegar assim (a11y formal é da QA — aqui só registro oportunístico); resposta das tarefas de transferência. Scorecard anonimizado (P1…P8) em research storage restrito (padrão AID-142/AID-180); gravações brutas deletadas após a síntese; nenhum dado entra em analytics.

## 4. Tarefas por lição (missão + transferência)

### l27 — "Debug com assistente: reproduza antes de perguntar" (prereq [l21], 4 min estimados)

- **Missão hospedada `/mission/dev/l27`** (a1 `sort` 5 passos; a2 `prompt_builder` 3 campos; a3 `missing_context` 6 opções/3 corretas). Pontos de observação específicos:
  - **a2 é o primeiro `prompt_builder` da trilha dev** com checagem por palavra-chave (`mustIncludeAny` ex.: campo Erro precisa conter "erro/exception/stack/falha/trace"; a verificação é engine-side — a bridge fail-closes para re-avaliação independente, `dojo-verification-bridge.mjs:1463`). Observar: o participante cola a mensagem real e passa? Falsa rejeição? A falha é percebida como justa (o feedback explica) ou como checagem arbitrária de palavras?
  - **a3 distratores** ("modelo de IA", "print da tela inteira"): são escolhidos? O feedback por-check desfaz o mito?
- **Transferência T27 (cenário novo, papel/Doc em branco, sem o produto):** "seu serviço cai às 03h com `NullPointerException` só no job noturno; você vai pedir ajuda ao assistente — escreva o pedido". **Sucesso = contém os 3 elementos:** mensagem exata do erro; passo que reproduz; esperado-vs-observado.

### l28 — "Refatore com assistente sem quebrar comportamento" (prereq [l21], 5 min)

- **Missão `/mission/dev/l28`** (a1 `choice`; a2 `rubric_review` 4 critérios com vereditos `partial`+3×`not_met`; a3 `output_comparison`). Pontos:
  - **a2/a3 são o primeiro uso de `rubric_review` em produção na track dev** (precheck 7653822). Observar: o vocabulário de veredito (atendido/parcialmente/não atendido) é compreendido sem dica? O veredito "parcial" de `c-preserva-comportamento` é aceito como legítimo ou parece arbitrário?
  - Dica como porta: quantos abrem hint em a2 (o plano de rewrite "limpa" é a isca do distrator)?
- **Transferência T28:** apresentar plano realista de assistente (preparado: "vou reescrever o serviço inteiro com a arquitetura nova e no final você roda os testes") → "você aceita? o que falta?". **Sucesso = recusa (ou aprova condicionada) + nomeia ao menos 2 de:** passos pequenos; teste entre passos (não só no fim); escopo mínimo; rede de testes antes.

### l29 — "Avalie as dependências sugeridas" (prereq [l22], 4 min)

- **Missão `/mission/dev/l29`** (a1 `choice` multiSelect 4 corretas + 2 distratores de aparência; a2 `rubric_review` 5 critérios — vereditos mistos `met`/`not_met`; a3 `missing_context` com distratores "estrelas"/"ano de criação"). Pontos:
  - **a1 distratores** ("nome fácil de digitar", "badges bonitos"): taxa de seleção; a2: "a mais popular" é lida como manutenção? a3: estrelas/ano são marcados?
  - O trio popularidade-≠-manutenção fica depois do feedback? (perguntar na pós-entrevista: "como você decide hoje adotar uma biblioteca sugerida?" — antes/depois do comportamento ensinado).
- **Transferência T29:** "um colega vai adicionar uma lib sugerida 'porque é a mais popular' — o que você pergunta antes do commit?". **Sucesso = nomeia ≥3 dos 4 cheques:** manutenção (versão recente/issues); licença; avisos de segurança; alternativa nativa.

**Anti-metodologia:** a ordem das missões não muda (é a canônica); transferências sempre após a missão correspondente (medem transferência imediata, não retenção — retenção é do funil/revisão espaçada e fica explicitamente fora).

## 5. Critérios de sucesso (gate formative, checklist falsificável)

No padrão AID-524 §5.3 — cotas observáveis por participante, com n declarado:

1. **(i) Conclusão sem quebra de expectativa:** ≥80% dos participantes concluem cada missão l27/l28/l29; **0 abandonos por quebra de expectativa** (qualquer abandono → nota de causa-raiz antes do próximo participante — tripwire interino).
2. **(ii) Fluência das atividades:** ≥80% passam cada atividade central (l27-a2, l28-a2, l29-a2) em ≤2 tentativas (dicas permitidas e contadas; tentativas registradas no scorecard).
3. **(iii) Transferência:** ≥80% em cada: T27 com 3/3 elementos; T28 recusa/condiciona + ≥2 requisitos; T29 com ≥3/4 cheques.
4. **(iv) Registro oportunista de a11y** (sem threshold — formal é da QA AID-631): qualquer barreira de teclado/`aria-live`/reflow observada vira entrada para a QA no mesmo dia.

**Tripwire de retrabalho (fusão com o tripwire vigente l30+ da spec AID-610 §7):** <80% em qualquer (i)–(iii) → issue de retrabalho da lição específica **antes** de a priorização de l30+ travar; resultado publicado como síntese anonimizada nesta issue (e work product), não como "eficácia comprovada".

## 6. Perfil e tamanho de amostra

- **n = 5–8 (formative; n≥5 é o padrão da casa AID-524 §5.3).** Poder estatístico declarado nulo — leitura direcional por cotas, não inferência. Com n<5 em qualquer célula (ex.: perfil novato), a célula é reportada como observação, não cota.
- **Perfil-alvo (público b da missão):** escreve código (profissional ou primeira função/transição) E usa assistente de IA ≥1×/semana E nunca contribuiu com este repo. Composição:
  - ≥2 **continuistas**: completaram a trilha dev até l23 no OS (medem a onda como ela será encontrada — entrada pelo mapa, prereqs frescos);
  - ≥2 **novatos na plataforma** com conhecimento equivalente a l21/l22 (screening: sabe o que é um teste automatizado; já revisou sugestão de código de assistente) — fazem aquecimento autoguiado de 10 min em l21/l22 **antes** da sessão, para o teste medir l27–l29 e não buraco de prereq;
  - 1 vaga flexível para papel adjacente (QA/analista que lê código) como sonda de borda do público.
- **Exclusões:** contribuidores do repo; quem authored/validou l27–l29; quem participa de decisões de conteúdo (contaminação).

## 7. Estratégia de recrutamento

1. **Canais (sem PII além do contato de agendamento):** rede do founder/CEO (indicação direta — fastest path, pedir na thread desta issue); comunidades BR de devs (Discord/Telegram/Slack); contatos da coorte AID-180 se recontatáveis pelo protocolo original.
2. **Formulário de screening (3 perguntas + contato):** papel/frequência de uso de assistentes; já usou o produto; disponibilidade. Dados usados só para agendar; deletados após a síntese (LGPD mínimo).
3. **Consentimento por escrito antes da sessão** (texto do protocolo AID-142 adaptado: gravação de tela/áudio, anonimização P1…Pn, direito de parar, nenhum uso de respostas para avaliar a pessoa, publicação apenas agregada/anonimizada).
4. **Incentivo:** nenhum prometido nesta fase (declarar no convite); se o founder optar por oferecer, declarar no termo de consentimento antes das sessões.
5. **Agenda:** 2–3 sessões/semana após QA GO; janela-alvo de conclusão ≤2 semanas (alinhada à Doc 3 janela A).

## 8. Papéis, fronteiras e escalonamento

- **Moderador/instrumento:** UX (produtor do instrumento; não marca mastery; não altera gates/currículo/produção).
- **Interpretação de resultado de aprendizagem que sugira mudar lição/gate:** escalar para **curriculum ownership** (CD/spec owner) via issue — este kit produz evidência, não alteração.
- **Defeitos técnicos/a11y observados:** encaminhar no mesmo dia para **QA Lead** (alimentam AID-631 se ainda aberta, ou issue de defeito) e **FPE** quando infra.
- **Conflito de prioridade cross-engine ou escopo:** escalar ao CEO (mandato).
