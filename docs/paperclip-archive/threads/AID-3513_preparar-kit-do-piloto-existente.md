# AID-3513: Preparar kit do piloto existente

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Growth Web Engineer | **Created:** 2026-09-30T20:53:08.100564+00:00 | **Updated:** 2026-11-01T14:14:28.402+00:00
- **ID:** `09193eb5-276e-4371-b97f-296ab103f0cd`

## Description

Preparar o kit operacional de facilitação do piloto já existente AID641/909, janela6–17outubro,5–8devs; verificar versão/datas atuais nos registros antes de fixar. Reusar roteiro, cotas e materiais existentes, completar somente lacunas. Entregar roteiro de sessão, tarefas observáveis, perguntas neutras, planilha/modelo de observação, critérios para interromper/retomar uma sessão e rascunhos de convite/follow-up rotulados NÃO ENVIADOS. Não recrutar, contactar, agendar, coletar dados pessoais, mudar população/janela ou abrir piloto paralelo.



Explicar que essa coorte Dev não comprova aprendizado não técnico; preparar proposta separada de avaliação não técnica apenas como hipótese futura, sem recrutamento. O site /escola/ está em publicação autorizada sob3453; não afirmar live até recibo. Conteúdo atual guiado e novas práticas3506/PR619 são candidatos revisados, não resultados de alunos. Growth Web Engineer revisa consistência das mensagens com páginas/links reais e promessas, sem alterar páginas congeladas. Entrega em documento nativo acessível ou draft versionado, com fontes, checklist de facilitador e lacunas/donos exatos. Sem gastos, novos serviços, publicação ou merge. Finalizar com próximo passo acionável condicionado ao piloto real; não criar monitores ou duplicatas.

## Document `AID-3513 — Kit operacional de facilitação do piloto O1 (l27–l29) — roteiro, tarefas, perguntas neutras, scorecard, interrupção/retomada, convites NÃO ENVIADOS` (2026-09-30)

# AID-3513 — Kit operacional de facilitação do piloto O1 (l27–l29) — v1

**Status:** KIT PRONTO (documento nativo, r1). Deliverable documental desta issue: NENHUM envio, recrutamento, contato, agendamento ou coleta de dados foi feito. Todos os rascunhos de §6 estão rotulados **NÃO ENVIADOS**.
**Owner:** Growth & Recruiter (b106db1d). **Facilitador/moderador das sessões:** UX Designer (AID-641 — execução e scorecards são dela; este kit é o pacote operacional de facilitação).
**Método:** REUSO — roteiro, tarefas, cotas e critérios vêm do kit `teste-moderado-o1` (AID-639, Doc 1/3 — CONGELADO, intocado) e do runbook `execucao-kit` (AID-641). Este doc apenas compila para uso operacional e preenche as lacunas apontadas na AID-3513 (perguntas neutras compiladas §3, modelo de observação §4, critérios de interrupção/retomada §5, convites/follow-ups NÃO ENVIADOS §6). Nenhuma mudança de população, janela, cotas ou instrumento.

---

## 0. Parâmetros verificados nos registros (fixados em 2026-09-30 — verificar de novo no dia)

Conforme a ordem ("verificar versão/datas atuais nos registros antes de fixar"), cada parâmetro abaixo foi conferido first-hand nos registros em 2026-09-30 ~21:0xZ:

| Parâmetro | Valor fixado | Fonte verificada |
| --- | --- | --- |
| Janela do piloto | **2026-10-06 → 2026-10-17** (janela v3) — S1 10-06→10-12 intros+contatos · S2 10-13→10-17 agendamentos+sessões (dias úteis 12:00–19:00Z; última útil ~10-16, teto 10-17) | Ruling CEO AID-3303, executado em AID-3305/hb63 (2026-09-29 04:09Z); registrado no tracker AID-909 (rev 09-29 19:03Z). **SUPERSIDE** a janela do ruling AID-3035/AID-3036 (~~funil 10-01→10-08 · sessões 10-09→10-15 · alvo ~10-10~~) — a janela 6–17/out da AID-3513 corresponde à v3 |
| n / população | **n=5–8 devs**, cotas do kit: ≥2 continuistas (trilha dev até l23) + ≥2 novatos c/ equivalência l21/l22 (aquecimento autoguiado 10 min antes) + 1 flex adjacente (QA/analista que lê código) | Kit AID-639 §6; inalterado |
| Canal | **founder-network ÚNICO** (c2cd1381/q2, restaurado por escolha do founder 09-26); disparo físico = pack §0.4 do doc `outreach` (AID-909) pelo founder | Card `cf8b749c` respondido 09-26 14:07Z (canal=founder-network); ruling AID-3035 confirma |
| Incentivo | **NENHUM** — "sem custo, sem remuneração e sem contrapartida" (supersede do acesso antecipado D-1326-1) | Card `cf8b749c` 09-26; delta v3 do doc `outreach` §0.4 (hb63) |
| Gatilho único do funil | Disparo dos cards DM pelo founder — card `c6bf17ab` (AID-641) **pending ~12d**; na abertura da S1 (1º hb ≥ 10-06) o G&R o supersede por 1 card foldado com datas v3 (diretiva CEO AID-3376) | AID-3376 (diretiva CEO 09-29 19:03Z); hb71 AID-909 09-30 18:59Z |
| Superfície sob teste | Missões `/mission/dev/l27|l28|l29` no pin de produção **`b6a0ea1b`** (commit = merge PR #414; canônico desde hb45b 09-17). QA GO AID-631 válido (veredito 09-02 13:40Z, pin `7653822`); conteúdo de l27–l29 == GO (verificado first-hand pela UX até 09-16) | Runbook AID-641; tracker AID-909 §pin. **Regra inalterada: UX re-checa o pin vigente a cada handoff, sanity §0 de moderador no pin vigente ANTES do participante 1, `deploy_id` anotado POR SESSÃO no scorecard** |
| Site `/escola/` | Publicação **AUTORIZADA** (AID-3453, autorização do founder 2026-09-30 20:47Z — "pode mandar bala", escopo fatia 616) — porém **NÃO afirmar live até recibo de publicação**. Este kit e os rascunhos §6 fazem ZERO afirmações sobre `/escola/`; a superfície do teste é o pin de produção acima | Comentário user na AID-3453 09-30 20:47Z; QA countersign 19:00Z |
| Conteúdo 3506/PR619 | Práticas de transferência AID-3506 (`done`) / PR619 = **candidatos revisados, NÃO resultados de alunos** — nenhuma copy pode citá-los como prova de eficácia | AID-3506; AID-3513 (ordem) |
| Funil atual | **0/0/0/0/0** (contatos→respostas→screened→agendados→concluídas; hb71 09-30 18:59Z) | Tracker AID-909 |

**Regra de re-verificação:** antes de cada uso operacional (S1 e cada sessão), re-confirmar janela/pin nos registros vivos (tracker AID-909 topo + runbook AID-641) — este doc NÃO supersede os registros; é compilação datada.

---

## 1. Roteiro de sessão (45–60 min) — REUSO integral do kit AID-639 §3

Ordem fixa, moderador = UX. Nada além disto foi acrescentado; textos-âncora verbatim do kit.

| Bloco | Tempo | O que fazer | Âncora verbatim (kit AID-639 §3) |
| --- | --- | --- | --- |
| A. Abertura | 5 min | Consentimento (gravação tela+áudio, anotação anonimizada, LGPD; sem coletar respostas de exercício além do que a tela mostra); permissão p/ pensar em voz alta | "não há jeito errado de usar; o teste é do produto, não seu" |
| B. Pré-entrevista | 5 min | Perfil SEM PII: papel (dev profissional/em transição/adjacente); frequência de uso de assistentes; já conhecia o AiDevSchool (qual trilha, até onde) | — |
| C. Aquecimento de navegação | 5 min | "chegue à lição sobre debug com assistente" — observar SEM ajudar (mapa, nome mod-05, expectativa pós-l23) | — |
| D. Missões + transferências | 25–35 min | l27 → l28 → l29 (ordem canônica); transferência T2x sempre APÓS a missão correspondente; intervenção do moderador SOMENTE em bloqueio técnico real (incidente) ou pedido explícito (registrado); dicas do produto permitidas e contadas | — |
| E. Pós-entrevista | 5 min | (1) "no seu trabalho real, o que você usaria amanhã?"; (2) "o que veio depois de l29?"; (3) nota 1–5 de confiança por comportamento (rotular auto-relato); (4) o que faltou | — |
| F. Fechamento | ~1 min | Agradecimento; resultados anonimizados alimentam decisões de conteúdo; "nada ali avalia a pessoa" | — |

Detalhes de observação por lição e critérios de sucesso: ver §2 abaixo e kit AID-639 §§4–5 (intocado).

## 2. Tarefas observáveis — REUSO do kit AID-639 §4 (checklist de observação por lição)

**l27 (debug — reproduza antes de perguntar):** missão a1 `sort` 5 passos · a2 `prompt_builder` 3 campos (1º da trilha com checagem por palavra-chave — observar: colou a mensagem real e passou? falsa rejeição? falha percebida como justa?) · a3 `missing_context` 6 opções/3 corretas (distratores escolhidos? feedback desfaz o mito?). **T27 (Doc em branco):** "seu serviço cai às 03h com `NullPointerException` só no job noturno; você vai pedir ajuda ao assistente — escreva o pedido". **Sucesso = 3/3:** mensagem exata do erro; passo que reproduz; esperado-vs-observado.

**l28 (refactor sem quebrar comportamento):** a1 `choice` · a2 `rubric_review` 4 critérios (1º uso em produção na track dev — vocabulário atendido/parcialmente/não atendido compreendido sem dica? "parcial" aceito como legítimo?) · a3 `output_comparison` (quantos abrem hint em a2?). **T28:** plano realista "vou reescrever o serviço inteiro… e no final você roda os testes" → "você aceita? o que falta?". **Sucesso = recusa/aprova condicionada + nomeia ≥2 de:** passos pequenos; teste entre passos; escopo mínimo; rede de testes antes.

**l29 (avalie dependências sugeridas):** a1 `choice` multiSelect 4 corretas + 2 distratores · a2 `rubric_review` 5 critérios · a3 `missing_context` (estrelas/ano marcados?). Pós: "como você decide hoje adotar uma biblioteca sugerida?" **T29:** "um colega vai adicionar uma lib 'porque é a mais popular' — o que você pergunta antes do commit?". **Sucesso = ≥3/4 cheques:** manutenção; licença; avisos de segurança; alternativa nativa.

**Anti-metodologia (inalterada):** ordem das missões não muda; transferências medem transferência imediata, NÃO retenção.

## 3. Banco de perguntas neutras — [LACUNA PREENCHIDA: compilação + regras de neutralidade; perguntas originais do kit AID-639 §3 B/C/E, nenhuma nova pergunta de conteúdo]

**Regras do moderador (neutralidade):**
1. Perguntar o comportamento, nunca sugerir a resposta ("o que você faria?" ≠ "você não acha que…?").
2. Não elogiar acerto nem lamentar erro — responder a tudo com neutro: "entendi", "pode seguir como quiser".
3. Silêncio é dado: esperar ≥10s antes de qualquer probe.
4. Probe neutro padrão: "no que você está pensando agora?" · "o que você esperava que acontecesse?" · "me conta o que você está vendo" — usar no máximo 1× por dúvida visível.
5. Proibido: nomear botões/opções ("clica no X"), antecipar conteúdo das lições, ajudar a passar atividade (ajuda só nos gatilhos do §1-D), ou mencionar cotas/critérios.

| Momento | Pergunta (verbatim do kit quando existente) | Risco de virose a evitar |
| --- | --- | --- |
| Abertura | "Pode pensar em voz alta? Não há jeito errado de usar; o teste é do produto, não seu." | Qualquer framing de "desafio"/"teste de habilidade" |
| Pré | "Qual é seu papel hoje?" · "Com que frequência usa assistentes de IA?" · "Já conhecia o AiDevSchool? Até onde foi?" | Perguntar senioridade por título/empresa (PII + chama juízo) |
| Aquecimento | "Chegue à lição sobre debug com assistente." | Dizer onde clicar; interpretar o mapa pelo participante |
| Durante missões | Só os probes do item 4 + "o que você esperava que acontecesse?" | Confirmar se resposta está certa/errada |
| T27 | Cenário verbatim §2, sem adicionar exemplos de resposta | Dar exemplo de "pedido bem escrito" |
| T28 | "Você aceita [o plano]? O que falta?" | Sugerir "não seria melhor testar antes?" |
| T29 | "O que você pergunta antes do commit?" | Listar os 4 cheques |
| Pós | As 4 do bloco E (§1), na ordem, sem comentar as respostas | Reagir a "usaria amanhã" com entusiasmo/desapontamento |

## 4. Modelo de observação (scorecard por participante) — [LACUNA PREENCHIDA: template operacional; campos = checklist de captura do kit AID-639 §3 + cotas §5; NENHUM critério novo]

**Regras de armazenamento (inalteradas):** scorecard anonimizado **P1…Pn**; fica com a UX (research storage restrito, padrão AID-142/AID-180); contato do participante NUNCA entra em issues/git/analytics; gravações brutas deletadas após a síntese.

```markdown
# Scorecard P_ (célula de cota: continuista | novato | flex-adjacente) — O1 l27–l29
Data/hora (UTC): ____ · Sessão remota, 45–60 min · Moderador: UX
Pin/deploy anotado NESTA sessão (regra por sessão): pin ____ · deploy_id ____ · alias aidevschool-codexdojo-os.netlify.app
Consentimento AID-142 assinado por escrito ANTES da sessão: [ ] sim (data/hora: ____)
Novato? Aquecimento autoguiado l21/l22 (10 min) feito antes: [ ] sim [ ] n/a

| Campo | l27 | l28 | l29 |
| Tempo até concluir a missão (min) | | | |
| Tentativas atividade central (a2) — cota (ii) ≤2 | | | |
| Dicas/hints abertos (contar e registrar quais) | | | |
| Missão concluída? — cota (i) | [ ] | [ ] | [ ] |
| Abandono/quebra de expectativa? (causa-raiz se sim) | | | |

Transferências — cota (iii): T27 [ ]3/3 elementos: erro__ reproduz__ esperado-vs-observado__ ·
T28 recusa/condiciona__ + requisitos (≥2): passos__ testes-entre-passos__ escopo__ rede-testes__ ·
T29 cheques (≥3/4): manutenção__ licença__ segurança__ alternativa-nativa__
Pós: usaria-amanhã (citação): ____ · "depois de l29?" (motivador-aberto__ frustrante__) ·
confiança 1–5 p/ comportamento (auto-relato declarado): l27__ l28__ l29__ · faltou: ____
Incidentes técnicos (timestamp + o quê): ____ · Citações literais de confusão: ____
a11y oportunista (teclado/aria-live/reflow) → encaminhar à QA NO MESMO DIA: ____
Interrupções (usar código do §5): ____ Retomada: ____ Resultado final: completa__ parcial__ replanejada__
```

Cotas e tripwires de síntese: kit AID-639 §5 [(i) ≥80% conclusão/0 abandonos por quebra; (ii) ≥80% a2 ≤2 tentativas; (iii) ≥80% por transferência; (iv) a11y oportunista sem threshold] — propriedade da UX (doc `sintese` AID-641); este template apenas os referencia.

## 5. Critérios para interromper/retomar uma sessão — [LACUNA PREENCHIDA; alinhado ao kit AID-639 ("pode parar a qualquer momento"; intervenção só em bloqueio técnico real/pedido explícito) e ao consentimento AID-142; nenhuma regra contradiz o instrumento]

**Códigos de interrupção (registrar no scorecard):**

| Código | Gatilho | Ação imediata | Retomada |
| --- | --- | --- | --- |
| INT-1 Pedido do participante | "quero parar/pausar" — qualquer motivo, sem necessidade de justificar | Pausar gravação na hora; confirmar se quer pausar ou encerrar; oferecer exclusão dos dados até ali | Participante decide retomar: retomar se a pausa ≤15 min E ele/quiser; senão replanejar slot dentro de S2 (teto 10-17) se vaga de cota permitir |
| INT-2 Bloqueio técnico real | Superfície indisponível/erro impeditivo no pin vigente (>5 min sem contorno) | Registrar incidente (timestamp+erro); não converter em teste de paciência; pausar | Se contornado ≤10 min: retomar do ponto + anotar incidente (NÃO re-executar missões já feitas); se >10 min: encerrar, replanejar slot S2, incidente → QA/FPE no mesmo dia |
| INT-3 Desconforto | Sinal de desconforto/mal-estar do participante | Parar imediatamente; sem perguntas de prospecção; oferecer encerrar e excluir dados | Somente por iniciativa explícita do participante; caso contrário encerrar com cortesia (§1-F) |
| INT-4 Falha de consentimento/gravação | Gravação não iniciou/corrompeu; consentimento não localizável | Pausar a sessão; NENHUM dado pode ser coletado sem consentimento válido | Re-obter consentimento por escrito (mesmo dia) ou prosseguir só com anotações manuscritas anonimizadas se participante re-consentir; se recusa, encerrar sem dados |
| INT-5 Limite de tempo | 60 min atingidos sem fechar bloco D | Anunciar; priorizar fechar a lição em curso + transferência correspondente; blocos C/E podem ser comprimidos, NUNCA pulados sem nota | n/a (gestão dentro da mesma sessão; registrar o que foi comprimido) |

**Invariáveis:** (a) participação é voluntária em todo momento — encerramento pelo participante NUNCA conta contra cota de "abandono por quebra de expectativa" (cota (i) mede quebra do produto, não desistência neutra: classificar a causa); (b) nenhum critério autoriza o moderador a intervir no fluxo do participante além do §1-D; (c) toda INT-* vira linha no scorecard + incidente mesmo-dia quando técnico (QA AID-631-herdeira/defect) — regra (iv) do kit; (d) sessão replanejada conta como 1 sessão nova (n=1 slot), mantendo n=5–8 dentro da janela v3.

## 6. Rascunhos de convite/follow-up — **NÃO ENVIADOS** (reuso do pack `outreach` AID-909 §0.4/§0/§4 com o delta v3 JÁ APLICADO: incentivo=nenhum, janela 10-06→10-17, sem promessa de pin, zero menção a `/escola/`)

> **RÓTULO OBRIGATÓRIO: NÃO ENVIADOS.** Nenhuma destas mensagens foi disparada. Envio é ato do FOUNDER (canal único), somente a partir da abertura da S1 (~10-06), via card foldado que supersede `c6bf17ab` (diretiva CEO AID-3376). O G&R não dispara nada. Contato de candidatos só entra em research storage restrito; zero PII em issues.

### 6.1 Convite DM — continuista (card DM-01 adaptado à v3) — NÃO ENVIADO
> Oi [nome]! Vi que você chegou ao fim da trilha dev do AiDevSchool — topa um teste de usabilidade de 45-60 min? Sessão remota entre 13 e 17 de outubro (dia útil, horário comercial): você percorre 3 lições novas (debug, refactor e dependências com assistente de IA) e fala em voz alta o que pensa. Gravo tela+áudio só com consentimento por escrito, sem câmera, e você pode parar quando quiser — o teste avalia o produto, não você. Sem custo, sem remuneração e sem contrapartida. Topa? Me responde aqui que te mando 3 perguntas rápidas pra agendar. 🙏

### 6.2 Convite DM — novato na plataforma (card DM-03 adaptado) — NÃO ENVIADO
> Oi [nome]! Você é dev e ainda não andou pelo AiDevSchool? Estou recrutando pra um teste moderado das 3 lições novas da trilha dev (debug/refactor/dependências com assistente de IA). Sessão remota de 45-60 min entre 13 e 17 de outubro; antes tem um aquecimento autoguiado de 10 min (lições básicas) pra você chegar no nível certo. Gravação de tela+áudio só com consentimento escrito; sem câmera; para quando quiser — avalia o produto, não você. Sem custo, sem remuneração e sem contrapartida. Topa? Me chama aqui que eu passo 3 perguntinhas rápidas.

### 6.3 Convite DM — papel adjacente (QA/analista que lê código; card DM-05 adaptado) — NÃO ENVIADO
> Oi [nome]! Você lê código no dia a dia (QA/analista)? Tem uma vaga no meu teste de usabilidade pra esse perfil: 45-60 min remotos entre 13 e 17 de outubro, percorrendo 3 lições novas de debug/refactor/dependências com assistente de IA, pensando em voz alta. Tela+áudio gravados só com consentimento por escrito, sem câmera, pode parar quando quiser. Sem custo, sem remuneração e sem contrapartida. Se topa, me responde que mando 3 perguntas rápidas pra agendar.

### 6.4 Follow-up — detalhes + screening 3 perguntas (relay pós-resposta; reuso §4 do `outreach`) — NÃO ENVIADO
> Fechado, [nome]! 3 perguntas rápidas (só pra te alocar na cota certa): (1) você escreve código profissionalmente, está em transição, ou trabalha adjacente (ex.: QA/analista)? (2) Com que frequência usa assistentes de IA (ChatGPT/Copilot/Claude etc.)? (3) Já usou o AiDevSchool? Até onde? — Responde aqui e eu já proponho horário: sessões de 45-60 min, dias úteis entre 13 e 17 de outubro, 12:00–19:00 UTC. Antes da sessão você recebe o termo de consentimento por escrito (gravação de tela+áudio, anonimização, direito de parar). Sem custo, sem remuneração e sem contrapartida.

### 6.5 Follow-up — lembrete de slot (véspera) — NÃO ENVIADO
> Oi [nome]! Confirmando nossa sessão amanhã, [horário UTC]. Links/convite chegam 15 min antes. Lembretes: remoto, 45-60 min, tela+áudio gravados conforme o consentimento que você assinou; sem câmera; pode parar quando quiser. [Se novato:] faz o aquecimento de 10 min (te mando o guia) antes do horário. Qualquer imprevisto, me avisa que remarcamos dentro da janela.

### 6.6 Follow-up — pós-sessão (agradecimento) — NÃO ENVIADO
> Valeu demais, [nome]! Sua participação vira análise anônima (você aparece só como P_) e alimenta decisões de conteúdo do AiDevSchool. Se eu puder voltar com uma dúvida rápida nos próximos dias, te aviso por aqui. Qualquer coisa, à disposição — de novo: sem custo, sem remuneração e sem contrapartida, só sua opinião honesta. 🙏

### 6.7 Follow-up — reposição de desistência (re-post do blurb T0 c/ delta v3) — NÃO ENVIADO
> Pessoal, seguindo o teste do produto de aprendizado de IA pra devs (lições curtas no ritmo Duolingo): abriram vagas pra sessões de 45-60 min entre 13 e 17 de outubro. Quem topa? Me responde aqui ou no privado que eu passo os detalhes e 3 perguntas rápidas. Sem custo, sem remuneração e sem contrapartida.

**Regras das copies (inalteradas + v3):** PT-BR, curtas, voz do produto; NADA além do script do teste (kit AID-639); nunca prometer pin/ferramenta/data além da janela v3; zero afirmação sobre `/escola/` (sem recibo de publicação) e zero citação de 3506/PR619 como resultado. Exclusões hard: contribuidores do repo; autores/validadores de l27–l29. **Revisão de consistência das mensagens:** Growth Web Engineer (issue filha criada nesta AID-3513) — conferir links/promessas vs páginas reais ANTES do primeiro disparo (~10-06), sem alterar páginas congeladas.

## 7. Limites de interpretação e proposta futura (não-técnico) — apenas hipótese, SEM recrutamento

1. **Esta coorte Dev NÃO comprova aprendizado do público não-técnico.** O1 testa devs (público b) em l27–l29; eficácia pedagógica não é presumida (AID-610 §7/§8.4; AID-558 §3.6/§7.4) e o resultado — mesmo 5/5 nas cotas — não transfere afirmação alguma para a jornada "IA no cotidiano" (público a). Nenhuma copy/síntese deste piloto pode ser usada como prova para o público não-técnico.
2. **Proposta separada (HIPÓTESE FUTURA — nenhum recrutamento, nenhum canal, nenhum contato):** quando houver fatia do público a publicada e revisada (ex.: rota `/escola/` com recibo + conteúdo equivalente revisado), rodar teste moderado espelho (n=5–8 não-programistas; cotas a definir pela UX; instrumento NOVO de propriedade da UX, padrão AID-639/AID-142; perguntas de transferência do cotidiano — ex.: verificar criticamente resposta de IA com fontes, tema vizinho das práticas AID-3506 que seguem candidatas, não resultado). Gatilho de decisão: founder/CEO, após síntese O1 + publicação com recibo. **Nada aqui autoriza pré-recrutamento.**
3. **`/escola/`:** publicação autorizada (AID-3453, 09-30 20:47Z) — afirmar "live" somente com recibo de publicação; este kit não depende dessa rota.
4. **3506/PR619:** candidatos revisados; não citar como resultado de alunos (aplicado em §6 e nas cópias da síntese futura — posse da UX).

## 8. Checklist do facilitador (dia −1 / dia 0) — [compilação operacional; obrigações existentes]

**Dia −1 (por sessão):** [ ] pin vigente re-confirmado com a UX (canônico `b6a0ea1b` até 09-30; regra: re-checar por handoff; se re-pin entre sessões → UX registra e re-executa sanity §0 de 1 sessão no novo pin) · [ ] consentimento AID-142 enviado e ASSINADO por escrito (lead ≥24h) · [ ] novato? aquecimento l21/l22 (10 min) agendado antes · [ ] scorecard §4 pronto (P_ + célula de cota) · [ ] gravação tela+áudio testada · [ ] janela v3 confirmada no tracker AID-909.
**Dia 0:** [ ] sanity §0 de moderador já válida no pin vigente (obrigação do dia 1, runbook AID-641 §0) · [ ] roteiro §1 na mão, âncoras verbatim · [ ] perguntas neutras §3 (regras + banco) · [ ] gatilhos de intervenção §1-D + códigos INT §5 · [ ] captura: tempos/tentativas/dicas/incidentes/citações/a11y oportunista · [ ] mesmo dia: a11y → QA; incidente técnico → QA/FPE; scorecard → research storage restrito; funnel G&R atualizado (AID-909 tracker).

## 9. Lacunas e donos exatos

| # | Item | Dono | Estado |
| --- | --- | --- | --- |
| 1 | Revisão de consistência das mensagens §6 com páginas/links reais e promessas (sem alterar páginas congeladas) — antes do 1º disparo ~10-06 | **Growth Web Engineer (5cf7ace9)** | Issue filha criada nesta AID-3513 |
| 2 | Supersede do card `c6bf17ab` por card foldado v3 na abertura da S1 (1º hb ≥ 10-06) | **G&R (b106db1d)** — diretiva CEO AID-3376; monitor 10-06T12:05Z ativo | Pendente por design (aguarda 10-06) |
| 3 | Sanity §0 no pin vigente antes do participante 1 + `deploy_id` por sessão + execução/scorecards/síntese | **UX (0bfa47c1)** — runbook AID-641 | Obrigação existente, inalterada |
| 4 | Disparo dos convites (canal único) | **Founder** — via card foldado pós-10-06 | Gatilho humano do piloto |
| 5 | Decisão sobre proposta de avaliação não-técnica (§7.2) | **Founder/CEO** | Hipótese; nenhum recrutamento |
| 6 | Recibo de publicação `/escola/` (para liberar qualquer menção futura) | **FPE/PRE** sob AID-3453 | Fora do escopo deste kit |

## 10. Fontes (verificadas 2026-09-30)

- Kit `teste-moderado-o1` — AID-639 Doc 1/3 (roteiro §3, tarefas §4, cotas §5, amostra §6, recrutamento §7) — congelado, reusado sem alteração.
- Runbook `execucao-kit` — AID-641 (sanity §0, deploy_id por sessão, linhagem de pins, protocolo de handoff G&R→UX).
- Ruling de janela — AID-3035/AID-3036 (09-27) SUPERSEDED por AID-3303/AID-3305 (09-29, janela v3) — tracker AID-909 (rev 09-29 19:03Z, topo).
- Outreach pack — doc `outreach` AID-909 §0/§0.4/§4/§5 + delta v3 (incentivo=nenhum).
- QA GO — AID-631 `done` 09-02 (veredito 13:40Z, pin `7653822`); conteúdo l27–l29 == GO até o último registro verificado.
- Consentimento — padrão AID-142; coorte AID-180/348 (precedente de método).
- `/escola/` — AID-3453: autorização user 09-30 20:47Z; countersign QA 19:00Z; sem recibo de publicação até 09-30 ~21:00Z.
- Conteúdo candidato — AID-3506 `done` (práticas de transferência) / PR619: candidatos revisados, não resultados.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3513 — Preparar kit do piloto existente
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 555b73c8-bf0a-40b9-b9b9-6da97f692f1e
- Agent: Growth Web Engineer (opencode_local)

## Objective

Preparar o kit operacional de facilitação do piloto já existente AID641/909, janela6–17outubro,5–8devs; verificar versão/datas atuais nos registros antes de fixar. Reusar roteiro, cotas e materiais existentes, completar somente lacunas. Entregar roteiro de sessão, tarefas observáveis, perguntas neutras, planilha/modelo de observação, critérios para interromper/retomar uma sessão e rascunhos de convite/follow-up rotulados NÃO ENVIADOS. Não recrutar, contactar, agendar, coletar dados pessoais, mudar população/janela ou abrir piloto paralelo.



Explicar que essa coorte Dev não comprova aprendizado não técnico; preparar proposta separada de avaliação não técnica apenas como hipótese futura, sem recrutamento. O site /escola/ está em publicação autorizada sob3453; não afirmar live até recibo. Conteúdo atual guiado e novas práticas3506/PR619 são candidatos revisados, não resultados de alunos. Growth Web Engineer revisa consistência das mensagens com páginas/links reais e promessas, sem alterar páginas congeladas. Entrega em documento nativo acessível ou draft versionado, com fontes, checklist de facilitador e lacunas/donos exatos. Sem gastos, novos serviços, publicaçã
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `555b73c8-bf0a-40b9-b9b9-6da97f692f1e` finished with status `succeeded` at 2026-10-01T18:51:00.154Z.
- Lendo o §7 rev13. Agora verificando: (1) comentário de adoção `6a03b932` no AID-909 (somente leitura), (2) fidelidade literal em relação à minha cópia `6f919925`, (3) ausência de qualquer inferência de duração combinada de 55–70min, (4) preservação de §§0–6 + kit intocado:

Todas as verificações de fidelidade foram aprovadas. Confirmando as revisões do documento do kit não foram modificadas e reexecutando as duas verificações de URL, em seguida registrando o veredito:

**Disposição: `done`** — parecer novo registrado (`3f06b3eb`), distinção do 1º preservada, AID-3513 devolvida a `done`.

**Veredito do delta §7 (rev `965d7233`): `approved`, sem correções necessárias.** Verificações first-hand:
- Copies (a)/(b) **verbatim idênticas** à minha `6f919925` (match exato programático)
- Duração: 0 ocorrências de "55–70"/"70 min" no §7; "45–60" e "10 min" (só novatos) separados, nunca somados
- Anti-sync verbatim da página; retorno pós-interrupção sem promessa de persistência (remete a INT-1..5 do kit §5); feedback só pelos canais existentes (§1-E/§6.6); primeiro passo = relay pós-agendamento; zero prerehearsal de l27–l29
- Links: apenas as 2 URLs verificadas (re-probada
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `555b73c8-bf0a-40b9-b9b9-6da97f692f1e` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (7)

**Growth & Recruiter** · 2026-09-30T21:01:05.057402+00:00

**G&R — Kit de facilitação do piloto O1 ENTREGUE (doc `kit-facilitacao` rev `af580b4c`, r1) — wake `issue_assigned` processado (0 comentários pendentes).**

## Parâmetros verificados nos registros ANTES de fixar (ordem atendida)
- **Janela v3: 2026-10-06 → 2026-10-17** (ruling CEO AID-3303/AID-3305, 09-29 — tracker AID-909 topo; SUPERSEDE o ruling AID-3035/3036 de 10-01→10-08/10-09→10-15). S1 10-06→10-12 intros+contatos · S2 10-13→10-17 agendamentos+sessões (úteis 12:00–19:00Z). n=5–8 devs, cotas AID-639 §6 inalteradas. A janela 6–17/out desta issue = v3. ✔
- **Canal = founder-network único · incentivo = NENHUM** (card `cf8b749c` 09-26). Pin canônico `b6a0ea1b` (UX re-checa por handoff; sanity §0 + `deploy_id` por sessão = obrigações do runbook AID-641, intocadas).

## Entregas do doc (reuso + somente lacunas)
1. **Roteiro de sessão** (§1) — reuso integral AID-639 §3, blocos A–F com âncoras verbatim.
2. **Tarefas observáveis** (§2) — reuso AID-639 §4 (l27/l28/l29 + transferências T27/T28/T29 com critérios de sucesso).
3. **Perguntas neutras** (§3) — [lacuna preenchida] regras de neutralidade + banco compilado das perguntas existentes (nenhuma pergunta de conteúdo nova).
4. **Modelo de observação/scorecard** (§4) — [lacuna preenchida] template P1…Pn com TODOS os campos de captura do kit + cotas (i)–(iv) referenciadas; scorecards ficam com a UX, contato só em research storage restrito.
5. **Critérios de interrupção/retomada** (§5) — [lacuna preenchida] códigos INT-1…INT-5 alinhados ao kit (participante para quando quiser; moderador só age em bloqueio técnico real/pedido explícito) e ao consentimento AID-142.
6. **Convites/follow-ups rotulados NÃO ENVIADOS** (§6) — reuso do pack `outreach` §0.4/§0/§4 com delta v3 JÁ aplicado (incentivo=nenhum; janela 13–17/out p/ sessões; zero promessa de pin; zero menção a `/escola/`). NADA foi enviado — disparo é do founder a partir de ~10-06 (card foldado que supersede `c6bf17ab` na abertura da S1, diretiva CEO AID-3376).
7. **Limites de interpretação** (§7): coorte Dev NÃO comprova aprendizado não-técnico; proposta separada de avaliação não-técnica registrada APENAS como hipótese futura (gatilho founder/CEO; zero recrutamento). `/escola/` = publicação autorizada sob AID-3453, **sem afirmar live até recibo**. 3506/PR619 = candidatos revisados, não resultados de alunos.
8. **Checklist do facilitador** (§8) + **lacunas/donos exatos** (§9) + fontes (§10).

## Seguimento delegado
- **AID-3526 (filha, owner Growth Web Engineer 5cf7ace9):** revisar consistência das mensagens §6 com páginas/links reais e promessas, ANTES do 1º disparo (~10-06), sem alterar páginas congeladas.

## Funil O1 (regra de heartbeat — números atuais)
**0/0/0/0/0** (contatos → respostas → screened → agendados → concluídas; hb71 AID-909, 09-30 18:59Z). Gatilho único do funil = disparo do founder (pendente); monitor S1 intacto → **10-06T12:05Z**.

**Conformidade:** nenhum recrutamento/contato/agendamento/PII; população/janela inalteradas; nenhum piloto paralelo; sem gastos/serviços/publicação/merge; nenhum monitor ou duplicata criados.

**Disposition: `in_review`** — caminho de revisão real: AID-3526 (GWE revisa mensagens do §6; G&R aplica correções via annotation até o disparo ~10-06). Próximo passo acionável condicionado ao piloto real: abertura da S1 em 10-06 (supersede foldado do `c6bf17ab` + disparo do founder), já registrada no tracker AID-909.

**Growth Web Engineer** · 2026-09-30T21:06:18.168438+00:00

**DECISÃO DE REVISÃO: `approve`** — Growth Web Engineer (5cf7ace9), etapa review do kit `kit-facilitacao` (rev `af580b4c`). Escopo do meu parecer (doc §9.1 / ordem da issue): consistência das mensagens do §6 com páginas/links reais e promessas. Verificado first-hand em 2026-09-30 ~21:2xZ:

## Verificação das promessas dos rascunhos §6 vs superfícies reais

| Promessa no §6 | Verificação first-hand | Resultado |
| --- | --- | --- |
| "3 lições novas (debug, refactor e dependências com assistente de IA)" | `engines/codexdojo-os-prototype/src/data/missions.ts`: l27 "Debug com assistente: reproduza antes de perguntar" (:1282), l28 "Refatore com assistente sem quebrar comportamento" (:1317), l29 "Avalie as dependências sugeridas" (:1352) — todas `trackId: "dev"`, `chapterOrder` 14–16 (novas no fim da trilha) | ✔ títulos/tópicos exatos |
| "trilha dev" / continuista "chegou ao fim da trilha dev" | Ordem da trilha dev em `missions.ts`: …l21, l22, l23, **l27, l28, l29** (não existem l24–l26) → quem completou até l23 completou tudo que existia antes da fatia nova | ✔ coerente com cota AID-639 §6 |
| Rotas sob teste | `/mission/dev/l27|l28|l29` exercitadas em `engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts:328,336,345`; montagem das missões no alias de produção atestada no evidence AID-631 Gate B (`docs/product-readiness/evidence/observations/2026-09-02-7653822-os-o1-promo-regrant-v22/observations.json`) | ✔ |
| Sessões "entre 13 e 17 de outubro", "dias úteis… 12:00–19:00 UTC" (6.4) | Ruling CEO verificado first-hand: comentário AID-3303 2026-09-29T04:06Z — "janela nova 2026-10-06→10-17, n=5–8 mantido, founder canal único"; 13–17/out = S2 (sessões); 12:00–19:00Z = kit §0 | ✔ |
| "Sem custo, sem remuneração e sem contrapartida" (incentivo=nenhum) | Presente em 6.1, 6.2, 6.3, 6.4, 6.6, 6.7 (6.5 é lembrete de slot, sem oferta); consistente com delta v3 (kit §0, card `cf8b749c`) | ✔ em todos os rascunhos de oferta |
| Zero menção a `/escola/`, zero promessa de pin, zero citação de 3506/PR619 | Grep dos rascunhos 6.1–6.7: 0 ocorrências de escola/619/3506/pin (apenas o cabeçalho §6 as cita como PROIBIÇÕES) | ✔ regra da issue atendida |
| Consentimento: "tela+áudio… consentimento por escrito, sem câmera, pode parar quando quiser" | Consistente com kit §1-A (gravação tela+áudio), §4 (consentimento AID-142 assinado ANTES) e §5 INT-1/INT-3 | ✔ |
| Aquecimento novato "10 min (lições básicas)" (6.2, 6.5) | l27 tem prereq `l21` (missions.ts:1286–1288) e l29 tem prereq `l22` (:1356–1358) — exatamente as lições de aquecimento do kit | ✔ |
| Duração 45–60 min em todos os rascunhos | = kit §1 (roteiro 45–60 min) | ✔ |
| Alias no scorecard §4 `aidevschool-codexdojo-os.netlify.app` | Confirmado como alias de PRODUÇÃO no evidence AID-631 Gate B (obs. 09-02, deploy 6a9816a5…) | ✔ |

## Notas não-bloqueantes (registro)
1. `missions.ts` working tree mostra `contentVersion: "2026-09-30.1"` (v3/v3/v2) para l27–l29 — conteúdo posterior à verificação UX de 09-16. **Mitigado pelo próprio kit** (§0/§8: UX re-checa pin por handoff + sanity §0 no pin vigente antes do participante 1 + `deploy_id` por sessão). Os rascunhos §6 não fazem claims de versão/conteúdo além dos tópicos, então nada a corrigir neste doc.
2. §6.1 "chegou ao fim da trilha dev" é preciso para o público continuista (fim = l23 na época); se G&R reescrever rascunhos por annotation, qualquer nova revisão do doc exige re-checagem minha (gatilho registrado na AID-3526).

## Veredito
`approve`. Nenhuma inconsistência de mensagem/página/link/promessa encontrada nos rascunhos §6; limites da issue (sem recrutamento/envio/PII, `/escola/` não afirmada live, 3506/PR619 não citados como resultado) respeitados no doc. Caminho de follow-up vivo intacto: AID-3526 (revisão pré-disparo) resolvida por este parecer; abertura da S1 em 10-06 segue com G&R/founder conforme tracker AID-909.

**founder** · 2026-09-30T23:33:15.391915+00:00

PO: fechar o handoff nativo pendente desta revisão usando o parecer a3d7a592 já realizado, sem repetir revisão do mesmo kit. A tela ainda mostra Review pending with Growth Web Engineer apesar do approve; registrar conclusão estruturada terminal suportada, com veredito/artefato coerentes. Houve um fato novo relevante: /escola/ foi publicada de verdade em30/09, deploy6abd7fcb784e28733ac75eaf, fonte d9dbdd5c, QA3517 com evidências reais. Preparar uma adaptação pequena e concreta do material de orientação do participante para distinguir entrada pública de fundamentos, Trilha Dev ainda planejada nessa entrada, e piloto O1 existente no OS; não mudar datas, amostra, consentimento ou canal de recrutamento. Rotas e promessas precisam corresponder ao que existe. Encaminhar somente esse delta ao Growth & Recruiter na mesma fila existente, com links e copy prontos para uso, sem outreach. Não fazer novas aceitações de termos/onboarding na verificação; ler telas/fontes basta. Nenhum participante fictício, dado real inventado ou alegação de sincronização entre sites.

**Growth Web Engineer** · 2026-09-30T23:41:48.587362+00:00

**GWE → G&R (b106db1d) — delta de orientação do participante pós-publicação de `/escola/` (pedido PO `467bf4eb`; copy/links prontos, NÃO ENVIADOS, sem outreach meu; postado nesta fila da AID-3513 porque AID-909 retornou 403 fora do meu boundary).**

## Fato novo verificado first-hand (2026-09-30 ~23:4xZ)
`/escola/` está publicada de verdade: `https://aidevschool-literacydojo.netlify.app/escola/` → HTTP 200, título "AI DevSchool — uma escola, duas jornadas", `escola.js` servido como `application/javascript` 14.9KB (não é mais o shell SPA do probe QA de 21:05Z em AID-3517). Fonte: merge PR #616 `d9dbdd5c` @ `e95611da` (QA GO + FSE review; autorização founder 20:44Z). A partir de agora o kit `kit-facilitacao` (AID-3513) pode citar `/escola/` como live — até então proibido por falta de recibo.

## O que a página REAL diz (base p/ qualquer copy — `engines/literacyDojo/public/escola/index.html`)
- Entrada pública = **fundamentos compartilhados** (F1–F4: Entender IA · Uso seguro · Prompt e contexto · Verificação), trilha adaptativa no app de lições (:35–:44, :88).
- Jornada Dev na entrada = **"prévia planejada"**: "l15, l16–l17, l21–l23 e l27–l29 do módulo 05 — ainda não fazem parte do percurso do app" (:57, :98) → **as lições do piloto NÃO existem no app de lições**.
- CodexDojo OS = card "laboratórios opcionais" linkando `https://aidevschool-codexdojo-os.netlify.app/` (:122–:126) — mesma superfície das sessões do piloto O1.
- Anti-sync explícito: "a entrada da escola não sincroniza entre experiências e não sabe onde você parou" (:115, :131).

## Copy pronta (NÃO ENVIADA — mesmas regras §6: disparo só pelo founder/canal único; nada muda em datas/amostra/consentimento/canal)

**(a) Orientação de participante — relay pós-agendamento, junto do link da sessão:**
> Sua sessão acontece no AiDevSchool OS — laboratórios de aprendizagem; é o link [da sessão no OS] que a gente usa no dia. Se você chegou pela entrada pública da escola (aidevschool-literacydojo.netlify.app/escola), uma nota rápida: essa entrada apresenta os fundamentos e as duas jornadas — a jornada Dev lá está como prévia planejada, e as três lições do nosso teste (debug, refactor e dependências com assistente de IA) ficam no OS, não no app de lições. O progresso é de cada experiência, no seu dispositivo — uma coisa não sincroniza com a outra.

**(b) Resposta pronta p/ "posso praticar antes?":**
> Pelo app de lições você vê os fundamentos (entender IA, uso seguro, prompt e contexto, verificação) — a avaliação inicial adapta a ordem pra você. As lições do teste ficam no OS e a gente percorre juntas na sessão; não precisa (e não dá pra) treinar nelas antes.

## Adoção sugerida (decisão sua, G&R)
Anexar como §6.8 do `kit-facilitacao` (rev `af580b4c` — eu não alterei o corpo; anchor de annotation rejeitado pelo validador, por isso o delta vive neste comentário) e usar (a) no relay 6.4/lembrete 6.5 quando houver link de sessão. Se adotar por nova revisão do doc, me chama que eu re-checo o delta em 1 pass (mesma regra da AID-3526 `done`).

Fontes: live probes acima; `git show d9dbdd5c` (merge door `scripts/merge_pr.sh`, countersigns AID-3453); AID-3517 `done`; AID-3526 `done` (parecer a3d7a592).

**Growth Web Engineer** · 2026-09-30T23:42:06.644306+00:00

kind: review
decision: approved

**DECISÃO: `approved` — conclusão terminal suportada (controle terminal: este comentário estruturado + PATCH `status=done`; mesmo controle do precedente AID-3537/ESE 23:31Z e AID-3497).** A pendência exibida ("Review pending with Growth Web Engineer") era resíduo do parecer `a3d7a592` postado como comentário simples, sem o campo estruturado — corrigida agora.

## Veredito (sem re-revisão — PO `467bf4eb`)
- **Approve do kit `kit-facilitacao` rev `af580b4c`** conforme parecer integral `a3d7a592` (etapa review, 21:06Z): 11/11 checagens de consistência §6 vs páginas/links/promessas first-hand (missions.ts:1277–1352; smoke :328–345; alias AID-631 Gate B; ruling AID-3303 09-29 04:06Z "10-06→10-17, n=5–8, founder canal único"; zero /escola//-pin-3506/PR619 nos rascunhos 6.1–6.7; incentivo=nenhum em toda oferta). Nada foi re-executado agora.
- Follow-up já resolvido: AID-3526 `done` (parecer `2f7ebc5e`).

## Fato novo processado neste heartbeat (delta encaminhado, não re-revisão do kit)
`/escola/` publicada de verdade (verificado first-hand: HTTP 200 + `escola.js` como JS 14.9KB em `aidevschool-literacydojo.netlify.app/escola/`; fonte PR #616 `d9dbdd5c`; QA AID-3517 `done`) → **delta de orientação do participante** (distinguir entrada pública/fundamentos · Trilha Dev "prévia planejada" na entrada · piloto O1 no OS; zero claim de sync) encaminhado ao G&R com copy/links prontos NÃO ENVIADOS no comentário `6f919925` desta fila. Nenhuma mudança de datas/amostra/consentimento/canal; nenhum outreach.

## Estado final
- Issue AID-3513: **done** (deliverable documental entregue e aprovado; disposição terminal registrada aqui).
- Próximos passos do piloto seguem com G&R/founder fora desta issue: abertura S1 em 10-06 (supersede foldado `c6bf17ab` + disparo founder, tracker AID-909); revisão pré-disparo já coberta (AID-3526).

**founder** · 2026-10-01T18:49:14.644738+00:00

PO — revisão independente APENAS do novo delta documental: G\&R incorporou sua copy6f919925 da3513 no SEU outreach da909, rev13 965d7233, nova§7 aditiva; §§0–6 e kit-facilitacao af580b4c preservados. Pedido de adoção6a03b932/hb74 na909. Growth Web Engineer, leia essa revisão e verifique somente fidelidade da incorporação e links/promessas adicionados: entrada pública fundamentos vs Dev prévia vs sessão O1 no OS, primeiro passo autorizado, anti-sync/retorno após interrupção honesto, feedback pelo canal existente, nenhum prerehearsal de l27–29. Duração45–60min + aquecimento10min deve ficar clara conforme compromisso do kit, sem inferir nova duração55–70min.



Use controles suportados de revisão de documento se disponíveis; registre SEU veredito e referência de revisão nesta3513, que é seu boundary. NÃO editar/comentar909: o403 anterior permanece respeitado, não usar proxy/ator/endpoint alternativo. Não rearmar a revisão completa já concluída do kit, não reexecutar11checks antigos nem criar filha; só veredito do NOVO delta§7. Rotas: leitura limitada, sem termos/signup/onboarding; lacuna real deve ficar explícita, nunca inventar validação. Sem outreach/PII/contatos/agendamento/monitores/mudança de datas/cotas/consentimento. Se encontrar correção necessária, devolva achado preciso ao PO para o legítimo G\&R; não escreva em nome dele. Se suporte nativo impedir, pare na primeira negação. Ao concluir este pedido, deixe3513Done preservando a aceitação anterior e distinguindo o parecer novo. [@Growth Web Engineer](agent://5cf7ace9-5f3b-429c-bf1a-50c5b188b1b8?i=globe)

**Growth Web Engineer** · 2026-10-01T18:50:51.937479+00:00

kind: review
decision: approved

**PARECER NOVO (2º, distinto do 1º): `approved` — incorporação do delta §7 fiel, sem promises adicionais indevidas.** Escopo EXCLUSIVO deste parecer: fidelidade da incorporação da minha copy `6f919925` no doc `outreach` da AID-909 **rev 13 `965d7233`** (nova §7 aditiva, 18:45Z) + links/promessas adicionados — conforme PO `7703c48f`. O 1º parecer (`a3d7a592` + decisão terminal `506583d0`) permanece válido e NÃO foi re-armado; nenhuma das 11 checagens antigas foi re-executada; nenhum child criado; AID-909 não foi editada/comentada por mim (GETs read-only somente; 403 anterior respeitado, sem proxy/ator/endpoint alternativo).

## Verificação first-hand do delta (2026-10-01, read-only)

| Item pedido pelo PO | Verificação | Resultado |
| --- | --- | --- |
| Fidelidade da incorporação | Copies (a)/(b) do §7.2/§7.3 comparadas programaticamente com o texto de `6f919925`: **verbatim idênticas** (match exato de string) | ✔ |
| Entrada pública vs Dev prévia vs sessão O1 no OS | §7.1 fixa: entrada = fundamentos F1–F4 + trilha adaptativa; jornada Dev "prévia planejada", l27–l29 "não existem no app de lições"; sessão real = OS — tudo confere com `index.html:35–44,57,98,122–126` | ✔ |
| Anti-sync/retorno após interrupção honesto | Verbo verbatim da página ao vivo ("não sincroniza entre experiências e não sabe onde você parou") citado em §7.1/§7.4; §7.5 promete ZERO persistência/retomada, remete aos INT-1..INT-5 do kit §5 (a cargo da UX) | ✔ nenhum claim novo |
| Primeiro passo autorizado | §7.2 usada "no fluxo §5/handoff quando houver link de sessão autorizado" — 1º passo = relay pós-agendamento com o link da sessão; nenhum convite a navegar no OS antes (evita pré-ensaio) | ✔ |
| Feedback pelo canal existente | §7.5: sessão (pós-entrevista kit §1-E) + resposta ao follow-up §6.6; "nenhum canal/ferramenta nova" | ✔ |
| Nenhum prerehearsal de l27–l29 | Copy (b) verbatim: "não precisa (e não dá pra) treinar nelas antes"; §7.5: aquecimento 10 min = navegação l21/l22, "NÃO treino de l27–l29 (proibido)" | ✔ |
| Duração sem inferir 55–70 min | Grep §7: 0 ocorrências de "55–70"/"70 min"/"55 min"; "45–60" ×1 (ratificada, kit §6.4) e "10 min" ×1 separado, escopado a **somente novatos** (kit §6.5) — nunca somados | ✔ |
| Links adicionados | Somente 2 URLs em §7, ambas re-probadas agora: `/escola/` → 200 text/html; OS → 200 text/html; "[da sessão no OS]" permanece placeholder (sem URL inventada) | ✔ |
| Preservação | Headers §§0–6 presentes no rev 13 (append aditivo); `kit-facilitacao` segue em **rev 1 `af580b4c`** (nenhuma revisão nova, 30s atrás verificado) | ✔ |
| Lacunas declaradas, não inventadas | §7.4: 2 lacunas explícitas com donos (app pós-avaliação inicial → GWE 1 pass quando política permitir — exige termos/signup, fora do permitido agora; fluxo de sessão no OS → UX, sanity §0 antes do participante 1) | ✔ honesto |

## Achado (nenhuma correção necessária)
Nenhuma divergência encontrada. Registro apenas 1 observação não-bloqueante: §7.4 atribui a mim (GWE) a lacuna "comportamento do app de lições pós-avaliação inicial" — atribuição legítima, mas essa checagem **permanece aberta** até haver autorização explícita para os passos de termos/signup hoje proibidos; não deve ser lida como validada.

**Referências:** doc `outreach` AID-909 rev `965d7233` §7 (lido via GET read-only); adoção PO `6a03b932` (18:42Z) + recibo incorporação hb74 `afc68af9` (18:45Z) confirmados na thread 909; probes ao vivo 2026-10-01 (2× HTTP 200). Aceitações anteriores preservadas: parecer `a3d7a592`, decisão `7f51c353`, AID-3526 `done` (`2f7ebc5e`), delta `6f919925`.

**Disposition: `done`** — pedido do PO atendido neste 2º parecer escopado.

---

