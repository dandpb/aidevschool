# AID-142 — protocolo de feedback do primeiro piloto

| Campo | Decisão operacional |
| --- | --- |
| Status | Pronto para revisão do CEO; não autoriza recrutamento |
| Escopo | Primeiro uso real: onboarding → escolha de trilha → primeira missão → feedback → retry → resultado |
| Jornadas | `IA Prática` e `Trilha Dev`, uma trilha por participante |
| Fonte normativa | `docs/design/canonical-learner-pilot/README.md` e `scorecard-template.csv` |
| Fora do escopo | Eficácia, retenção, mastery, comparação entre engines, mudanças de currículo/gate |

## 1. Problema e hipótese

**Evidência disponível:** a jornada canônica exige separar tentativa, feedback, evidência, verificação independente e mastery. O protocolo canônico já define consentimento, campos seguros e limiares para uma rodada de cinco sessões por audiência. Ainda não há evidência de uso real que demonstre compreensão ou fluidez.

**Hipótese a testar:** cada audiência consegue escolher a trilha correta, iniciar a missão recomendada, agir antes de receber solução, interpretar o feedback e distinguir conclusão local, verificação independente e mastery sem direção do moderador.

**Preferência operacional:** sessão moderada remota ou presencial de até 25 minutos, sem gravação. A brevidade reduz carga, mas perde a possibilidade de reanalisar fala ou linguagem corporal; por isso o moderador codifica ocorrências durante a sessão.

## 2. Amostra e parada

- Primeiro piloto: uma sessão consentida de `IA Prática` e uma de `Trilha Dev`, somente para validar o protocolo e descobrir bloqueios críticos.
- O piloto de duas sessões **não** mede eficácia e **não** satisfaz os limiares do protocolo canônico de 5 participantes por audiência.
- Elegibilidade, exclusões e missões seguem o protocolo canônico: `l02` para IA Prática e `game-02-warehouse` para Trilha Dev, salvo alteração registrada antes da sessão.
- Parar imediatamente se houver recusa/retirada de consentimento, risco de exposição de dados, escrita canônica inesperada, falsa indicação de mastery ou indisponibilidade que impeça a tarefa.

## 3. Preparação (responsável operacional)

1. Usar perfil limpo do navegador e a revisão/deploy aprovados; registrar apenas revisão, missão e versão de conteúdo.
2. Criar código aleatório sem tabela de correspondência, por exemplo `AI-01-K7Q`.
3. Copiar `docs/design/canonical-learner-pilot/scorecard-template.csv` para o armazenamento de pesquisa restrito, fora do git.
4. Confirmar que não há gravação de tela, áudio, replay, texto digitado ou analytics com identificador bruto.
5. Ter disponíveis: cronômetro, scorecard allowlisted, este roteiro e canal de retirada pelo código da sessão.

## 4. Abertura e consentimento (ler literalmente)

> Estamos testando o produto, não você. Participar é voluntário. Vamos guardar apenas um código anônimo, resultados das tarefas, tempos e observações codificadas do produto. Não guardaremos seu nome, e-mail, tela, áudio, respostas, prompts ou identificadores de conta. Você pode parar a qualquer momento. Você concorda em continuar?

Registrar somente `consent=yes|no` e o minuto UTC. Se `no`, encerrar; guardar apenas a contagem agregada de recusas, sem linha de sessão.

### Perguntas pré-sessão (resposta categórica, sem fala literal)

1. “Qual descrição combina mais com você hoje?” Codificar `ai-pratica` ou `dev` conforme elegibilidade; se nenhuma, encerrar como inelegível sem criar linha.
2. “Você usa alguma tecnologia assistiva ou ajuste de interface para navegar?” Codificar apenas `declared_adjustment=yes|no`; registrar a barreira observada em código, nunca o diagnóstico ou nome da condição. Esse campo fica na folha de facilitação e só entra na síntese agregada, não no CSV canônico.

Não perguntar nome, idade exata, empregador, e-mail, deficiência/diagnóstico, experiência em texto livre ou dados demográficos não necessários.

## 5. Roteiro moderado

O moderador pode dizer apenas “O que você está procurando?” e “O que espera que isso faça?”. Não apontar controles, corrigir resposta, revelar solução nem transformar ajuda em sucesso.

| Etapa | Instrução ao participante | Observar/codificar |
| --- | --- | --- |
| Orientação | “Começando aqui, configure um caminho de aprendizagem que combine com você. Avise quando achar que terminou.” | tempo; trilha escolhida; `NAVIGATION`, `WORDING`, `TRACK_CHOICE`; maior severidade |
| Início | “Encontre e comece a primeira missão recomendada para sua trilha.” | `mission_started`; `MISSION_START`; recuperação sem direção |
| Tentativa | “Complete esta missão como faria normalmente. Pode pensar em voz alta; não posso ajudar com a resposta, mas o produto pode.” | primeira ação avaliável antes de ajuda; tempo; sem registrar conteúdo da resposta/prompt |
| Feedback | Após a primeira falha: “O que este retorno pede que você melhore?” | `feedback_understood`; `FEEDBACK`; não guardar formulação literal |
| Hint/retry | Se pedir ajuda, permitir hint do produto. “O que você faria agora?” | `hint_used`, se revelou solução, `retry_possible`, `HINT`/`RETRY` |
| Resultado | “O que esta tela diz que você concluiu? O que foi verificado de forma independente? O que significa mastery aqui?” | três campos de compreensão; `RESULT_STATE`; outage separado |
| Fechamento | “Algo que você esperava aconteceu de forma diferente?” | converter imediatamente em código existente; descartar fala literal |

Se surgir um problema não coberto, usar `OTHER_CODED` e registrar somente etapa + severidade + contagem agregável. Não criar texto livre por conveniência.

## 6. Eventos comportamentais permitidos

Coletar no máximo os campos do scorecard canônico. Eventos permitidos são derivados desses campos e não carregam pessoa, conta, resposta ou conteúdo digitado:

| Evento | Propriedades allowlisted |
| --- | --- |
| `onboarding_finished` | código de sessão, audiência, segundos, completo sim/não, código, severidade |
| `mission_started` | código de sessão, missão, versão, sim/não, segundos |
| `attempt_observed` | tentativa antes de solução sim/não |
| `feedback_observed` | compreensão sim/não, hint usado, hint revelou solução, retry possível |
| `result_interpreted` | compreensão local/verificação/mastery, cada uma sim/não |
| `session_ended` | `completed`, `drop_off` ou `technical_failure`; retirada sim/não |

Não coletar resposta de exercício, prompt, fala literal, texto livre, nome, contato, IP, user-agent, ID de conta/dispositivo, gravação, screenshot com dados pessoais ou identificador bruto de analytics. Telemetria não substitui evidência de aprendizagem.

## 7. Acessibilidade, confusão e recuperação

- Severidade `0`: nenhuma fricção; `1`: hesita e se recupera; `2`: precisa de prompt neutro; `3`: não consegue prosseguir.
- Registrar foco invisível, ordem de teclado, rótulo inacessível, contraste/zoom, conteúdo não anunciado, movimento ou linguagem confusa pelo código de etapa mais próximo e severidade. Na síntese agregada, usar categoria `accessibility` sem diagnóstico ou fala literal.
- Falha técnica continua no denominador após consentimento e vira `technical_failure`; não ensinar um desvio silencioso.
- Se o participante quiser retirar dados, marcar `withdrawal_requested=yes`, apagar a linha pelo código e manter apenas contagem agregada de retiradas.

## 8. Perguntas pós-sessão e síntese

Codificar, não transcrever:

1. “Quão claro foi escolher sua trilha?” → `clear`, `partial`, `unclear`.
2. “Quão claro foi saber o que fazer depois do feedback?” → `clear`, `partial`, `unclear`.
3. “Você confiaria no resultado para dizer que dominou o tema?” → `no_correct_boundary`, `yes_false_mastery`, `uncertain`.
4. “O que mais atrapalhou?” → um dos códigos canônicos + severidade.

Síntese por audiência, sem juntar resultados:

- funil factual: consentiu → onboarding completo → missão iniciada → tentativa → retry → sessão concluída;
- contagem e severidade por código de fricção;
- compreensão de feedback e dos três estados;
- barreiras de acessibilidade agregadas;
- falhas técnicas e retiradas;
- decisão: `protocol_ready`, `revise_before_more_sessions` ou `stop_for_safety`.

Regras de decisão para as duas sessões: qualquer severidade 3, falsa mastery, hint que revele solução, escrita canônica, campo proibido ou barreira de acessibilidade sem recuperação exige `revise_before_more_sessions` (ou `stop_for_safety` quando houver risco de dados/gate). Sem esses sinais, `protocol_ready` autoriza apenas propor a rodada 5+5 ao CEO; não autoriza alegação de eficácia.

## 9. Governança e retenção

- Moderador: produz scorecard e síntese; não verifica o próprio trabalho.
- Revisor independente: confere allowlist, denominadores, aritmética, fronteira de evidência e ausência de claims.
- CEO: revisa este protocolo antes de qualquer convite; recrutamento e agenda ficam em sistema separado, sem contato na issue.
- Dados por sessão: armazenamento com acesso restrito, fora do git, exclusão em 30 dias após síntese; preservar somente agregados. Pedido de retirada apaga a linha correspondente.
- Nenhuma sessão escreve em `learner/`, `.mavis/`, currículo, gate ou projeção gerada; resultados locais não significam mastery.

## 10. Checklist de revisão do CEO

- [ ] Escopo de duas sessões como teste de protocolo, sem claim de eficácia.
- [ ] Audiências, missões e revisão/deploy confirmados.
- [ ] Consentimento e canal de retirada aprovados.
- [ ] Campos/eventos permitidos e proibições aceitos.
- [ ] Moderador e revisor independente nomeados.
- [ ] Armazenamento restrito e exclusão em 30 dias definidos.
- [ ] Nenhum convite enviado antes da aprovação.

Após aprovação, a operação deve usar o scorecard canônico sem adicionar colunas livres. Qualquer mudança em missão, gate, retenção, dados ou analytics exige nova revisão dos owners competentes.
