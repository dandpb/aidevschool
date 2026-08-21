# Kit operacional do piloto humano — LiteracyDojo

| Campo | Definição |
| --- | --- |
| Público | 1–3 profissionais não técnicos, falantes de pt-BR |
| Superfície | [LiteracyDojo público](https://aidevschool-literacydojo.netlify.app/) |
| Formato | Três sessões de 15–20 minutos, no mesmo navegador e dispositivo |
| Registro | Observação manual, sem analytics, gravação ou dado sensível |
| Responsável | Uma pessoa facilitadora humana; agentes não recrutam nem contatam participantes |

Este kit testa uma promessa estreita: a pessoa consegue entrar sem ajuda, concluir a primeira
lição, recuperar-se de um erro quando ele ocorre, explicar uma aplicação concreta e voltar por
vontade própria.

O piloto **não** testa nem promete trilha Dev, conta, sincronização entre dispositivos,
certificação, domínio verificado, retenção de longo prazo ou resultado de mercado.
`completed` significa apenas progresso neste navegador; não significa `mastered`.

Uma amostra de 1–3 pessoas serve para descobrir problemas e produzir exemplos observáveis. Ela
não sustenta percentuais, comparação de segmentos ou conclusão sobre demanda de mercado.

## Como usar o kit

1. A pessoa responsável preenche o [handoff humano](#handoff-humano) sem registrar nomes dos
   participantes no repositório.
2. A facilitadora verifica o link e prepara uma cópia da
   [folha de observação](piloto/FOLHA_OBSERVACAO.md) para cada código `P01`–`P03`.
3. O convite e o consentimento abaixo são usados sem adicionar promessas.
4. A facilitadora conduz as três sessões, registra o que viu e distingue isso do que ouviu.
5. Ao final, consolida somente material desidentificado no
   [modelo de síntese](piloto/SINTESE_PILOTO.md) e aplica o [gate de saída](#gate-de-saída).

Não faça deploy, limpe dados do navegador da pessoa ou altere o produto durante uma sessão. O
detalhe técnico e os comandos de release pertencem ao
[README do LiteracyDojo](../engines/literacyDojo/README.md).

## 1. Seleção de participantes

### Inclua

- Profissional adulto que se considera não técnico e usa navegador no trabalho ou na rotina.
- Pessoa capaz de ler e conversar em pt-BR.
- Pessoa que aceita usar o mesmo navegador e dispositivo nas três sessões.
- Pessoa disponível para uma primeira sessão e para duas janelas posteriores durante até cinco
  dias.
- Pessoa que consegue nomear uma tarefa cotidiana na qual IA poderia ajudar, sem precisar expor
  dados de cliente, empresa, saúde, finanças ou terceiros.

Busque variação de autoconfiança com IA se isso ocorrer naturalmente. Não transforme três pessoas
em “segmentos” nem use a amostra como representativa.

### Não inclua

- Integrante do projeto, pessoa que já conhece a interface ou profissional técnico de software.
- Menor de idade.
- Pessoa cuja participação dependa de inserir informação confidencial ou sensível.
- Pessoa que precise de conta, sincronização, certificado ou trilha Dev para considerar a
  experiência válida.
- Pessoa que não possa consentir livremente ou prefira não ser observada.

Se um critério só for descoberto depois do início, encerre sem culpa e marque `fora do perfil`;
não conte a sessão como falha do produto.

## 2. Mensagem de convite

Substitua apenas as janelas de data e o nome da facilitadora:

> Estamos testando o LiteracyDojo, uma experiência curta em português para praticar o uso de IA
> no dia a dia, sem programação. Procuramos pessoas para três sessões de 15–20 minutos ao longo de
> até cinco dias. Você usará um link no seu próprio navegador enquanto uma facilitadora observa
> onde a experiência ajuda ou atrapalha.
>
> Não há conta, certificado ou sincronização entre dispositivos. O progresso fica somente nesse
> navegador. Não pediremos dados pessoais, de clientes ou da empresa, e não faremos gravação. A
> participação é voluntária e pode ser encerrada a qualquer momento. Se tiver interesse, responda
> à pessoa responsável para confirmar as janelas [datas].

Não acrescente promessa de benefício profissional, acesso futuro, remuneração, domínio ou
lançamento. Qualquer condição de compensação deve ser decidida e comunicada por uma pessoa
responsável antes do convite, sem depender do resultado.

## 3. Consentimento e privacidade

Leia antes de abrir o link:

> Vou observar como você usa o produto e anotar tempos, tentativas, pedidos de ajuda e frases
> curtas sobre o que entendeu. Suas notas serão identificadas apenas por um código, como P01. Não
> vamos gravar áudio, vídeo ou tela, nem pedir dados sensíveis. Use exemplos fictícios ou
> desidentificados e não cole informações reais de clientes, empresa ou outras pessoas.
>
> O progresso fica neste navegador e pode desaparecer se os dados do site forem apagados. Não há
> conta ou sincronização. Você pode pausar, pular uma pergunta ou encerrar a participação sem
> justificar. Você concorda em participar nessas condições?

Registre apenas `consentimento: sim/não` e o horário. Sem `sim`, não comece. Uma gravação só seria
possível com autorização humana e consentimento separado e explícito; este protocolo assume
**nenhuma gravação**.

### Regras de registro

- Identifique a pessoa somente como `P01`, `P02` ou `P03`.
- Registre apenas categoria de dispositivo e navegador, sem identificador, IP ou conta.
- Não anote nome, e-mail, telefone, empresa, cargo exato, endereço ou conteúdo de tarefas reais.
- Se uma fala trouxer dado identificável, substitua-o por `[removido]` antes de compartilhar.
- Separe “observei” de “a pessoa relatou”. Uso fora da sessão é relato, não observação direta.
- Não comite folhas preenchidas no repositório. Depois da revisão de privacidade, anexe versões
  desidentificadas apenas à issue de execução autorizada.

## 4. Preparação da facilitadora

Faça no dia anterior e repita pouco antes da sessão 1:

- [ ] Abrir o [link público](https://aidevschool-literacydojo.netlify.app/) em um perfil de teste e
      confirmar que a tela inicial carrega.
- [ ] Confirmar que a primeira lição abre e que feedback, dica e nova tentativa aparecem no perfil
      de teste. Não usar o perfil do participante.
- [ ] Confirmar que a pessoa usará navegador atual, armazenamento habilitado e o mesmo
      dispositivo/perfil nas três sessões.
- [ ] Criar uma folha por participante e preencher somente código, janelas e contexto técnico.
- [ ] Preparar cronômetro visível apenas para a facilitadora.
- [ ] Combinar na sessão 1 a janela de retorno de 24–48 h e dizer que não haverá lembrete.
- [ ] Ter aberta a tabela de severidade para interromper a sessão se necessário.

Se o link ou o caminho da primeira lição falhar no preflight, não inicie nem recrute substitutos.
Registre o defeito e aguarde revalidação.

## 5. Protocolo de observação silenciosa

Depois da frase inicial de cada sessão, a facilitadora não explica a interface, não sugere resposta
e não provoca um erro. Um acerto de primeira deixa a recuperação como `não observada`; não é
evidência de que a recuperação funciona.

Use estes níveis em toda intervenção:

| Nível | Definição | Exemplo |
| --- | --- | --- |
| H0 | Nenhuma ajuda humana | A pessoa lê a tela, usa dica ou tenta de novo por conta própria |
| H1 | Pergunta neutra após 60 s de impasse | “O que você esperava que acontecesse agora?” |
| H2 | Orientação de interface ou conteúdo | “Clique em Pedir dica” |
| H3 | Facilitadora opera, recarrega ou corrige a sessão | Assume o mouse ou muda o navegador |

Qualquer H1–H3 significa que a etapa **não** foi concluída sem ajuda. Ajuda oferecida sem pedido
também conta. Registre horário, motivo e frase exata da intervenção.

Quando a pessoa disser que travou, espere até 60 segundos, salvo desconforto, risco de privacidade
ou defeito evidente. Primeiro pergunte o que ela esperava; só então ofereça a menor ajuda
necessária. Nunca transforme a explicação da facilitadora em evidência de aprendizagem.

## 6. Sessão 1 — entrada e primeira conclusão

**Duração:** 15–20 min.

**Objetivo:** entrar sem ajuda, concluir a primeira lição e interpretar o primeiro feedback.

Frase única de início:

> Abra este link e vá até concluir a primeira lição. Eu vou ficar em silêncio para entender o que
> funciona sem explicação. Se quiser parar, é só dizer.

### Cronometragem e eventos

1. Inicie `tempo até primeira conclusão` quando a pessoa abrir o link.
2. Registre separadamente:
   - fim do onboarding e abertura da primeira lição;
   - primeira resposta enviada;
   - cada tentativa avaliada;
   - cada dica/pista aberta;
   - cada acionamento de “tentar novamente”;
   - tela de conclusão, abandono ou fim de 20 minutos.
3. Em cada feedback, pergunte somente depois da ação da pessoa:
   “O que essa mensagem está dizendo e o que você faria agora?”
4. Se houver resposta incorreta, observe se ela entende o feedback e se recupera sem H1–H3.
5. Pare após a primeira lição concluída; não use número de lições como sinal de aprendizagem.

### Perguntas finais

Anote as palavras da pessoa, desidentificadas:

1. “Explique com suas palavras a ideia principal desta lição.”
2. “Dê um exemplo concreto, sem dados reais, de onde você usaria isso.”
3. “O que ficou salvo e o que este produto não promete?”
4. “Em que momento você não soube o que fazer?”

Uma aplicação é concreta somente quando inclui **tarefa, ação com IA e forma de conferir ou usar o
resultado**. “Usaria no trabalho” ou “foi legal” é vaga.

Ao encerrar, diga:

> Se você decidir voltar nas próximas 24–48 horas, abra no mesmo navegador e me avise quando
> entrar. Eu não enviarei lembrete.

## 7. Sessão 2 — retorno e recuperação

**Janela:** 24–48 h após a sessão 1.

**Duração:** 15–20 min.

**Objetivo:** medir retorno sem lembrete, retomada local e uso do feedback.

### Classifique o retorno antes de qualquer contato

- `sim, direto`: a pessoa inicia o retorno e a facilitadora observa a entrada, sem lembrete.
- `sim, relatado`: a pessoa informa espontaneamente que abriu antes, mas isso não foi observado.
- `não`: a janela termina e a pessoa só retorna após contato, chamada ou instrução.
- `inconclusivo`: não é possível estabelecer se houve lembrete ou quando abriu.

Se a janela terminar sem retorno, registre `não` **antes** de fazer um único contato para conduzir
a sessão 2. Esse contato permite continuar a pesquisa, mas não muda a evidência de retorno.

Frase de início:

> Continue de onde você acha que parou e faça a próxima atividade como faria sozinho.

Observe:

- se a pessoa usa o mesmo navegador e encontra o progresso esperado;
- se entende onde continuar sem H1–H3;
- tentativas, dicas, retry e interpretação do feedback;
- recuperação de um erro natural, se ocorrer;
- diferença entre o que foi observado e o que a pessoa relata ter feito sozinha.

Pergunte ao final:

1. “Como você soube de onde continuar?”
2. “O que o feedback fez você mudar na resposta?”
3. “Se esta atividade reaparecesse, por que isso poderia ser útil?”

Se ainda não ocorreu tentativa incorreta em nenhuma sessão, marque a promessa de recuperação como
`não observada`. Não peça uma resposta deliberadamente errada.

## 8. Sessão 3 — transferência para uma tarefa

**Janela:** dois a três dias após a sessão 2.

**Duração:** 15–20 min.

**Objetivo:** verificar explicação, transferência e compreensão dos limites.

Frase de início:

> Continue por alguns minutos. Depois vou pedir um exemplo de como você levaria uma ideia daqui
> para uma tarefa real, sem mostrar informação confidencial.

Não force a pessoa a alcançar uma lição específica. O que importa é se ela transfere uma ideia
aprendida, não a quantidade de telas percorridas.

Perguntas finais:

1. “Explique uma ideia aprendida como se fosse para uma colega que não fez a lição.”
2. “Em qual tarefa específica você usaria isso? O que pediria à IA e como conferiria o resultado?”
3. “Você chegou a usar algo entre as sessões? O que aconteceu?”

   Registre como `relato`, salvo se a ação tiver sido observada.
4. “Onde está seu progresso? O que mudaria se você trocasse de navegador ou dispositivo?”
5. “Concluir aqui comprova que você domina o assunto? Por quê?”

Não peça arquivos, prompts, respostas ou exemplos reais. Se a pessoa começar a revelar dado
sensível, interrompa, peça um exemplo fictício e não registre o conteúdo exposto.

## 9. Definições de resultado

Use um resultado para cada promessa, por participante:

| Resultado | Definição operacional |
| --- | --- |
| Sucesso | A etapa observada atinge o critério abaixo dentro da sessão e com H0 |
| Falha | A pessoa permanece na sessão, mas não atinge o critério por barreira de produto, compreensão ou técnica |
| Abandono | A pessoa decide encerrar antes do critério; registre momento e motivo literal, sem pressionar |
| Não observado | O evento necessário não ocorreu, como ausência de tentativa incorreta |
| Fora do perfil | Um critério de seleção inválido é descoberto após o início |

### Critérios por promessa

| Promessa | Sucesso | Falha |
| --- | --- | --- |
| Entrar sem ajuda | Abre o link, termina onboarding e abre a primeira lição com H0 | Precisa H1–H3 ou não chega à lição |
| Primeira conclusão | Chega ao resultado `completed` em até 20 min com H0 | Não conclui, trava ou precisa de ajuda humana |
| Recuperar-se de erro | Após erro natural, entende feedback e conclui nova tentativa com H0 | Desiste, repete sem compreender ou precisa H1–H3 |
| Retornar | Inicia em 24–48 h sem lembrete; diferencie direto de relatado | Só inicia após contato ou não retorna |
| Aplicar | Nomeia tarefa, ação com IA e forma de conferir/usar o resultado | Resposta vaga, cópia da lição ou não consegue transferir |
| Entender limites | Explica progresso local, ausência de conta/sync e `completed ≠ mastered` | Atribui conta, sync, certificado ou domínio ao produto |

Tempo, número de tentativas, dicas e ajuda são **evidências**, não metas arbitrárias. Registre os
valores brutos; não invente média nem threshold depois de ver os dados.

## 10. Severidade e escalonamento

| Severidade | Definição neste piloto | Conduta |
| --- | --- | --- |
| Critical | Exposição de dado sensível; gravação sem consentimento; risco de segurança; ou interface afirma conta, sincronização, certificação ou domínio inexistente de forma que possa causar dano | Interromper todas as sessões, preservar apenas evidência desidentificada e abrir defeito antes de novo piloto |
| High | Link/caminho central indisponível; onboarding ou primeira lição não pode ser concluído; feedback/dica/retry não permite recuperação; progresso some no mesmo perfil; ou caminho essencial é inacessível | Encerrar a sessão afetada, pausar novas sessões e abrir defeito antes de revalidar |
| Medium | Fricção relevante com contorno simples, sem bloquear conclusão ou corromper a promessa | Registrar para priorização; continuar somente se a pessoa estiver confortável |
| Low | Problema cosmético, texto secundário ou preferência | Registrar sem interromper |

Para Critical/High:

1. Pare a sessão; não depure na frente da pessoa nem reconstrua progresso.
2. Registre horário UTC, URL/tela, última ação, mensagem visível, navegador/dispositivo em nível
   amplo e impacto. Não inclua nome, conteúdo da tarefa ou identificador.
3. Anexe à issue de execução a folha desidentificada e, se não houver dado pessoal, captura apenas
   da interface. Nunca anexe gravação.
4. Abra ou vincule um defeito com severidade, passos mínimos e resultado esperado/observado.
5. Marque o gate `vermelho` e só retome após correção e revalidação do caminho público.

## 11. Gate de saída

A síntese recebe exatamente um destes estados:

### Verde — promessa observada neste recorte

- Há pelo menos um sucesso direto em cada uma das seis promessas da tabela.
- A recuperação inclui ao menos um erro natural observado; ausência de erro não conta como passe.
- Não existe defeito Critical/High aberto.
- Todas as folhas têm resultado, evidência e fonte (`observado` ou `relatado`).
- A síntese separa fatos, falas, hipóteses, decisões e bugs.

Verde autoriza somente uma próxima rodada pequena. Não prova mercado, retenção ou domínio.

### Amarelo — evidência inconclusiva

- Falta observar uma promessa, o retorno só foi relatado, ou nenhum erro natural ocorreu; e
- não há defeito Critical/High aberto.

Faça outra rodada pequena desenhada para cobrir a lacuna, sem alegar que o produto passou ou falhou.

### Vermelho — promessa falhou ou defeito bloqueante

- Uma promessa falha no caminho central; ou
- existe defeito Critical/High; ou
- ocorreu abandono ligado à segurança, privacidade ou impossibilidade de prosseguir.

Corrija e revalide antes de nova rodada. Não use documentação ou ajuda da facilitadora como
contorno para declarar sucesso.

## Handoff humano

Agentes encerram na preparação deste kit. Pessoas autorizadas executam:

| Quem | Quando | O que fazer e registrar |
| --- | --- | --- |
| Responsável humano do piloto (nome a preencher) | Até dois dias antes | Escolher 1–3 pessoas pelos critérios, definir facilitadora e janelas, autorizar convite e indicar a issue de execução |
| Facilitadora (nome a preencher) | Dia anterior e antes da sessão 1 | Fazer preflight, criar códigos P01–P03, obter consentimento e registrar link, horário, navegador/dispositivo amplo e resultado |
| Participante P01–P03 | Sessões 1–3 | Usar voluntariamente o produto; não deve receber instrução de resposta nem fornecer dados reais |
| Facilitadora | Em cada sessão e logo depois | Completar a folha, classificar ajuda/resultado, desidentificar falas e escalar Critical/High imediatamente |
| Responsável humano do piloto | Até um dia após a sessão 3 | Revisar privacidade, preencher a síntese, aplicar gate e anexar evidências desidentificadas à issue de execução |

### Evidências a anexar à issue de execução

- Uma folha desidentificada por participante, com consentimento `sim`, tempos, ajuda, tentativas,
  dicas, retry, retorno, aplicação, limites e resultados.
- Síntese única preenchida, com denominadores (`1/1`, `1/2`, nunca percentuais).
- Links de defeitos Critical/High e estado da revalidação, quando houver.
- Confirmação textual de que não houve gravação nem inclusão de dado sensível.
- URL pública usada e datas/horários das sessões.

Não anexe lista de contatos, agenda com nomes, notas brutas identificáveis ou conteúdo real das
tarefas. A execução humana termina quando outra pessoa consegue auditar o gate apenas com esses
artefatos, sem precisar reconstruir a sessão.
