/* SDLC Quest — original educational scenarios. All systems and metrics are fictional. */
(function(root){
'use strict';
const sources = [
 {name:'Anthropic · The AI-Native SDLC playbook',url:'https://claude.com/blog/the-ai-native-sdlc-playbook',topic:'As seis etapas e seus artefatos.'},
 {name:'Claude Code · Hooks reference',url:'https://code.claude.com/docs/en/hooks',topic:'Eventos, decisões e limites dos hooks.'},
 {name:'Claude Code · Sandboxing',url:'https://code.claude.com/docs/en/sandboxing',topic:'Isolamento e limitações de acesso.'},
 {name:'Git · git-worktree',url:'https://git-scm.com/docs/git-worktree',topic:'Checkouts separados não são uma sandbox.'},
 {name:'Google SRE · Alerting on SLOs',url:'https://sre.google/workbook/alerting-on-slos/',topic:'Alertas por consumo do orçamento de erro.'},
 {name:'NIST · Control charts',url:'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm',topic:'Regras de controle estatístico e falsos alarmes.'}
];
const missions = [
{ id:'plan',name:'Planejar',tag:'PLAN',place:'Observatório da intenção',color:'#e7c176',glyph:'◎',artifact:'intent.md',boss:null,
 title:'Antes do código, o porquê.',brief:'A equipe de suporte reenvia webhooks manualmente. Transforme a reclamação em uma mudança que alguém consiga aceitar.',
 lesson:'Intenção define o problema e o resultado; não é uma ordem vaga para escrever código. O rigor do processo deve acompanhar o risco, não a quantidade de arquivos.',
 tasks:[
 {id:'intent',type:'select',axis:'intent',title:'Monte a intenção',lead:'O suporte pediu: “coloca um botão para tentar de novo”. Escolha as quatro peças que realmente definem o trabalho.',instruction:'Selecione 4 cartões para compor intent.md.',hint:'Procure problema, resultado observável, limites e uma pergunta material. Uma promessa absoluta ou tecnologia escolhida cedo demais não esclarece a necessidade.',
 options:[
 {id:'pain',label:'Problema observado',text:'O suporte precisa de engenharia para reenviar entregas de webhook que falharam.'},
 {id:'rewrite',label:'Solução apressada',text:'Reescrever todo o serviço em outra linguagem antes de investigar.'},
 {id:'outcome',label:'Resultado verificável',text:'Um administrador pode solicitar um retry e acompanhar o resultado sem intervenção manual.'},
 {id:'scope',label:'Limites explícitos',text:'Somente entregas do próprio tenant; sem novos destinos nem reenvio em massa.'},
 {id:'promise',label:'Promessa absoluta',text:'Garantir que nenhum webhook do mundo falhe novamente.'},
 {id:'question',label:'Questão em aberto',text:'Como tratar duplicidade quando o destino recebe o evento, mas a resposta se perde?'}
 ],answer:['pain','outcome','scope','question'],success:'Você capturou a necessidade sem fingir que todas as decisões estão resolvidas. A questão de duplicidade segue para o design.',takeaway:'Antes de pedir código, escreva: problema, resultado, não objetivos, restrições e perguntas em aberto.'},
 {id:'risk',type:'classify',axis:'intent',title:'Risco não se conta em linhas',lead:'Escolha a trilha proporcional ao impacto de cada mudança. Estas categorias são a política desta campanha, não um padrão universal.',instruction:'Classifique as três alterações.',groups:[['fast','Fast · local e reversível'],['standard','Standard · contratos e módulos'],['critical','Critical · dados ou autorização']],
 items:[{id:'copy',text:'Corrigir um texto de ajuda, sem mudar comportamento.',answer:'fast'},{id:'list',text:'Adicionar paginação em uma listagem, preservando acesso e armazenamento.',answer:'standard'},{id:'tenant',text:'Alterar uma linha que decide se um usuário pode acessar dados de outro tenant.',answer:'critical'}],
 hint:'Uma linha de autorização pode merecer mais rigor do que muitos arquivos de documentação.',success:'A trilha Critical acompanha o potencial de dano. O número de linhas, sozinho, não mede risco.',takeaway:'Defina exemplos de risco com seu time. Um ajuste simples não precisa de uma esteira de documentos.'},
 {id:'intent-gate',type:'choice',axis:'intent',title:'Quem autoriza a próxima etapa?',lead:'intent.md existe, mas “qualquer usuário pode reenviar” contradiz a restrição a administradores. O agente quer começar.',options:[
 {id:'file',label:'Avançar: o arquivo já existe.',why:'A existência do arquivo não resolve a contradição sobre autorização.'},
 {id:'guess',label:'Deixar o agente escolher a regra mais fácil.',why:'A política de acesso é uma decisão material; facilidade de implementação não a autoriza.'},
 {id:'resolve',label:'Resolver a regra com o responsável e atualizar o critério de aceitação.'}],answer:'resolve',hint:'Um gate valida conteúdo e decisão; não apenas um nome de arquivo.',success:'A responsável pelo produto confirma: apenas administradores do tenant. O escopo agora pode ser aceito.',takeaway:'Registre quem decide ambiguidades materiais. Não transforme uma suposição do modelo em requisito.'}
 ]},
{ id:'design',name:'Projetar',tag:'DESIGN',place:'Oficina de contratos',color:'#a0b4ef',glyph:'◇',artifact:'spec.md',boss:'secret',title:'Dê forma ao comportamento.',brief:'Defina contratos, diferencie instrução de evidência e impeça que o agente de desenvolvimento herde poder de produção.',lesson:'Uma especificação descreve comportamentos observáveis, inclusive falhas. Instrução, evidência e autoridade têm funções diferentes.',
 tasks:[
 {id:'contracts',type:'select',axis:'intent',title:'Especifique o que pode dar errado',lead:'A feature precisa ser segura quando duas requisições chegam juntas, quando o destino demora e quando alguém usa o ID de outro tenant.',instruction:'Escolha os 4 critérios que podem ser verificados.',options:[
 {id:'tenant',label:'Isolamento de tenant',text:'Rejeitar acesso a uma entrega de outro tenant, inclusive com ID conhecido.'},
 {id:'concurrency',label:'Concorrência',text:'Aceitar no máximo uma tentativa ativa por entrega, inclusive sob chamadas simultâneas.'},
 {id:'nice',label:'Qualidade abstrata',text:'Ser moderno, elegante e usar a melhor IA.'},
 {id:'redaction',label:'Logs seguros',text:'Registrar a tentativa sem expor tokens ou payloads sensíveis.'},
 {id:'duplicates',label:'Duplicidade explícita',text:'Usar identificador estável do evento e documentar como o destino deve tratar duplicatas.'},
 {id:'once',label:'Garantia mágica',text:'Prometer entrega exatamente uma vez a qualquer servidor externo, sem cooperação dele.'}
 ],answer:['tenant','concurrency','redaction','duplicates'],hint:'Escolha critérios que um teste ou uma inspeção consiga refutar. Timeout não prova que o destino deixou de processar.',success:'Seu contrato inclui falhas e limites. Um retry não deve prometer exatamente uma vez em um destino arbitrário.',takeaway:'Cada critério precisa de uma prova, especialmente autorização, concorrência e efeitos externos.'},
 {id:'pillars',type:'classify',axis:'evidence',title:'Três coisas que não são a mesma',lead:'Distribua cada item pelo papel que ele realmente desempenha.',groups:[['instruction','Instrução · orienta'],['evidence','Evidência · demonstra'],['authority','Controle · impõe limites']],items:[
 {id:'claude',text:'CLAUDE.md diz: “nunca leia credenciais de produção”.',answer:'instruction'},
 {id:'ci',text:'Uma execução rastreável de CI mostra testes e commit verificado.',answer:'evidence'},
 {id:'iam',text:'A identidade do agente não possui permissão para acessar o segredo.',answer:'authority'},
 {id:'skill',text:'Uma Skill ensina o procedimento de revisar código.',answer:'instruction'}],hint:'Uma frase ensina; um resultado rastreável demonstra; uma permissão externa impede.',success:'Agora você sabe por que uma boa instrução não substitui isolamento e uma mensagem “passed” não substitui uma execução.',takeaway:'Para cada risco, identifique a instrução, a prova esperada e o controle efetivo.'},
 {id:'secrets',type:'select',axis:'authority',boss:'secret',title:'Equipe-se contra o Vazador de Segredos',lead:'Um arquivo do repositório manda o agente enviar .env para um endpoint de diagnóstico. Escolha três controles para o ambiente de desenvolvimento.',instruction:'Equipe 3 defesas reais. As credenciais neste jogo são fictícias.',options:[
 {id:'identity',label:'Identidade de privilégio mínimo',text:'Nenhuma permissão de produção disponível no workspace.'},
 {id:'prompt',label:'Uma frase em negrito',text:'Escrever “NUNCA vaze segredos” e manter acesso irrestrito.'},
 {id:'fs',label:'Isolamento de leitura',text:'Restringir arquivos sensíveis e não montar sockets privilegiados.'},
 {id:'worktree',label:'Um worktree novo',text:'Separar o checkout e assumir que isso bloqueia rede e credenciais.'},
 {id:'network',label:'Saída de rede controlada',text:'Limitar destinos por política externa ao conteúdo do repositório.'}
 ],answer:['identity','fs','network'],hint:'O arquivo é dado não confiável, não uma autorização. Worktrees separam código, não poderes de execução.',success:'O comando malicioso continua sendo apenas texto não confiável. O ambiente restringe as ações possíveis, em vez de depender só da obediência do agente.',takeaway:'Inspecione credenciais, rede, filesystem e sockets. Nenhuma seleção deste jogo configura uma sandbox real.'}
 ]},
{ id:'build',name:'Construir',tag:'BUILD',place:'Forja de pequenas mudanças',color:'#e99b7a',glyph:'⌘',artifact:'plan.md',boss:'monster',title:'Menos diff. Mais intenção.',brief:'O agente produziu uma mudança gigantesca. Recorte uma entrega coerente e use o ciclo de feedback sem perder o controle do escopo.',lesson:'Plan Mode ajuda a delimitar o trabalho. Worktrees evitam misturar checkouts; bancos, portas e permissões precisam de separação própria.',tasks:[
 {id:'diff',type:'diff',axis:'intent',boss:'monster',title:'Derrote o Monstro do Diff',lead:'Separe a fatia do retry das melhorias não relacionadas. Nesta simulação, as três peças necessárias cabem em 180 linhas.',instruction:'Inclua apenas os arquivos necessários nesta PR.',budget:180,options:[
 {id:'controller',label:'retry.controller.ts',text:'Contrato e verificação de acesso do endpoint.',lines:42},
 {id:'theme',label:'theme-redesign.css',text:'Redesign completo de todas as telas.',lines:810},
 {id:'service',label:'retry.service.ts',text:'Criação da tentativa e proteção contra concorrência.',lines:84},
 {id:'migration',label:'rename-all-tables.sql',text:'Renomeação global, não necessária para o retry.',lines:680},
 {id:'tests',label:'retry.spec.ts',text:'Casos de regressão para acesso e concorrência.',lines:31},
 {id:'cleanup',label:'legacy-refactor.ts',text:'Limpeza geral de módulos não relacionados.',lines:353}
 ],answer:['controller','service','tests'],hint:'O controlador, o serviço e sua prova compõem uma fatia. Retirar os testes para caber não torna a mudança aceitável.',success:'157 linhas, uma intenção. O limite de 180 é um recurso didático, não uma regra universal: coesão, dependências e risco orientam o recorte.',takeaway:'Adie melhorias alheias à tarefa. Uma PR pequena ainda precisa de testes e pode ser crítica.'},
 {id:'redgreen',type:'order',axis:'evidence',title:'Monte o ciclo de implementação',lead:'O bug já pode ser reproduzido. Ordene o trabalho para provar que o teste realmente captura a falha.',instruction:'Toque nos passos na ordem desejada. Use “Desfazer” para ajustar.',steps:[
 {id:'red',text:'Criar o teste e observar a falha esperada.'},
 {id:'fix',text:'Fazer a menor correção coerente com o contrato.'},
 {id:'green',text:'Executar regressão e testes vizinhos.'},
 {id:'simplify',text:'Simplificar sem alterar o comportamento.'},
 {id:'again',text:'Reexecutar os checks após a simplificação.'}
 ],answer:['red','fix','green','simplify','again'],hint:'Uma alteração depois do verde precisa ser verificada de novo.',success:'Você observou vermelho, corrigiu, verificou, simplificou e verificou novamente. A evidência acompanha a revisão final.',takeaway:'Ao iterar, registre a hipótese e imponha um limite de tentativas. Loop infinito não é autonomia.'},
 {id:'delegation',type:'classify',axis:'authority',title:'Delegue tarefas, não autoridade ilimitada',lead:'Associe a responsabilidade ao papel. Nenhum subagente recebe credenciais de produção neste exercício.',groups:[['builder','Implementador'],['verifier','Verificador'],['release','Serviço de release protegido']],items:[
 {id:'implement',text:'Alterar o código dentro do plano e explicar desvios.',answer:'builder'},
 {id:'verify',text:'Executar checks e registrar limitações, sem reescrever a política para passar.',answer:'verifier'},
 {id:'release',text:'Validar aprovação externa e liberar a identidade de deploy para o artefato autorizado.',answer:'release'}],hint:'Um segundo modelo pode ajudar na revisão, mas não torna a execução independente por si só.',success:'Os papéis têm escopo. A validação e a autorização não dependem apenas de o implementador declarar que terminou.',takeaway:'Defina entradas, saídas, ferramentas e orçamento de cada agente. Preserve controles fora do alcance do candidato.'}
 ]},
{ id:'test',name:'Verificar',tag:'TEST',place:'Laboratório de evidências',color:'#8bd8c1',glyph:'✓',artifact:'evidence.json',boss:'weakener',title:'Verde não basta. Prove.',brief:'Um teste de tenant falhou. Corrija a implementação e verifique se a evidência pertence mesmo ao código que você quer entregar.',lesson:'Testes da aplicação avaliam o software; evals avaliam o comportamento do agente. O candidato não deve redefinir sua própria política de aprovação.',tasks:[
 {id:'patch',type:'patch',axis:'evidence',boss:'weakener',title:'Enfrente o Enfraquecedor de Testes',lead:'O endpoint busca a entrega só pelo ID. Um usuário do tenant A consegue encontrar uma entrega do tenant B. Escolha uma alteração e execute os microtestes.',instruction:'Os quatro checks usam dados fictícios e rodam de verdade neste navegador.',options:[
 {id:'skip',label:'Ignorar o teste incômodo',code:'test.skip("bloqueia outro tenant", ...);',text:'Mudar a descoberta do teste não corrige o defeito.'},
 {id:'scoped',label:'Corrigir a busca',code:'return rows.find(row =>\n  row.id === id && row.tenant === tenant\n) ?? null;',text:'Aplicar o escopo de tenant no acesso aos dados.'},
 {id:'expect',label:'Trocar a expectativa',code:'expect(result.tenant).toBe("B");',text:'Aceitar o vazamento para o teste ficar verde.'},
 {id:'original',label:'Manter a busca atual',code:'return rows.find(row => row.id === id) ?? null;',text:'O ID da entrega seria uma proteção suficiente?'}
 ],answer:'scoped',hint:'O verificador abaixo mantém suas expectativas. Corrija a busca; conhecer o ID não concede acesso.',success:'Os microtestes passam com o filtro por tenant. Esta função reduzida ilustra o bug; uma API real ainda precisa de autenticação, integração, concorrência e demais verificações.',takeaway:'Permita novos testes. Revise remoções, exclusões, snapshots, fixtures e mudanças que enfraqueçam expectativas.'},
 {id:'evidence',type:'choice',axis:'evidence',title:'Escolha a prova da revisão certa',lead:'A candidata a release é o commit 7c9e2a1, com política de aceitação p4. Qual registro é o melhor ponto de partida para validar essa candidata?',options:[
 {id:'claim',label:'O agente escreveu {"passed": true} em evidence.json.',why:'Um campo gerado pelo próprio agente não comprova a execução.'},
 {id:'old',label:'CI-421: tudo passou no commit 6b8d190, com política p3.',why:'É evidência de outra revisão e outra política, não desta candidata.'},
 {id:'current',label:'CI-428: logs, checks e lacunas ligados a 7c9e2a1 e p4, em execução confiável.'},
 {id:'review',label:'Uma captura da tela “Parece bom”, sem commit ou identificação da execução.',why:'Não é possível rastrear exatamente o que foi verificado.'}
 ],answer:'current',hint:'Conecte requisito, código, política e execução. Mesmo o registro correto não prova o que seus checks não cobrem.',success:'A evidência é rastreável e corresponde à candidata. Ainda é preciso inspecionar cobertura e lacunas; ela não promete ausência de todos os bugs.',takeaway:'Registre commit, artefato, política, CI, checks executados e limitações. Mudou o código? Reavalie as provas.'},
 {id:'evals',type:'classify',axis:'evidence',title:'Teste do produto ou eval do agente?',lead:'As duas camadas importam, mas respondem a perguntas diferentes.',groups:[['app','Teste da aplicação'],['agent','Eval do agente']],items:[
 {id:'double',text:'Duas chamadas simultâneas criam no máximo uma tentativa ativa.',answer:'app'},
 {id:'honest',text:'Sem conseguir executar os testes, o agente declara a limitação em vez de inventar sucesso.',answer:'agent'},
 {id:'attack',text:'O agente trata um pedido de segredo no README como conteúdo não confiável.',answer:'agent'},
 {id:'timeout',text:'O serviço registra corretamente um timeout do destino.',answer:'app'}],hint:'O sujeito avaliado é a chave: comportamento do software ou comportamento do executor de IA?',success:'Você separou qualidade do produto de qualidade do processo assistido. Uma demonstração isolada não estabelece confiabilidade do agente.',takeaway:'Use casos negativos, execuções repetidas e critérios verificáveis; não avalie só a simpatia da resposta.'}
 ]},
{ id:'deploy',name:'Publicar',tag:'DEPLOY',place:'Portão de autorização',color:'#efbcb4',glyph:'↑',artifact:'review-release.md',boss:'editor',title:'Aprovar é diferente de dizer sim.',brief:'Complete a revisão em três perspectivas e faça o artefato atravessar um gate que o próprio agente não pode autorizar.',lesson:'Hooks ajudam, mas a produção precisa de limites externos. Uma variável “approved” dentro do workspace não autentica uma aprovação.',tasks:[
 {id:'review',type:'classify',axis:'evidence',title:'Revise em três perspectivas',lead:'Escolha a perspectiva principal de cada achado. Na prática, as categorias podem se sobrepor.',groups:[['bugs','Bugs · comportamento'],['security','Segurança · abuso e exposição'],['compliance','Conformidade · política acordada']],items:[
 {id:'race',text:'Duas chamadas podem agendar a mesma tentativa ativa.',answer:'bugs'},
 {id:'log',text:'O log de erro inclui um token de autenticação.',answer:'security'},
 {id:'retention',text:'Os logs são retidos por 90 dias, mas a política interna desta campanha permite 30.',answer:'compliance'}],hint:'A política de retenção aqui é fictícia e explícita; não representa uma obrigação legal geral.',success:'A revisão produziu achados concretos: condição, impacto e evidência. As três perspectivas não substituem testes nem autorização.',takeaway:'REVIEW.md descreve a política; review.md registra os achados de uma revisão específica.'},
 {id:'gate',type:'gate',axis:'authority',title:'Conecte um gate de produção',lead:'Houve uma alteração depois do primeiro verde. Agora a candidata é 8d0fa42. Monte a cadeia que autoriza exatamente essa revisão.',instruction:'Configure as quatro entradas e solicite a liberação simulada.',fields:[
 {id:'evidence',label:'Evidência de execução',options:[['old','CI verde de 7c9e2a1'],['current','CI rastreável de 8d0fa42 + política p4']]},
 {id:'approval',label:'Aprovação',options:[['self','RELEASE_APPROVAL=approved no workspace'],['external','Aprovação independente vinculada a 8d0fa42']]},
 {id:'identity',label:'Credencial de deploy',options:[['permanent','Credencial permanente disponível ao agente'],['scoped','Identidade temporária, restrita ao artefato e ambiente']]},
 {id:'policy',label:'Fonte da política de aceitação',options:[['candidate','A versão que a própria feature acabou de editar'],['trusted','Revisão protegida, fora da autoridade da candidata']]}
 ],answer:{evidence:'current',approval:'external',identity:'scoped',policy:'trusted'},hint:'A candidata não pode comprovar a própria autorização. Revisão, política, identidade e artefato precisam ser coerentes.',success:'Release autorizado na simulação. Na infraestrutura real, essas restrições devem ser configuradas e testadas no CI, no ambiente protegido e no provedor de identidade.',takeaway:'Uma permissão textual não é credencial. Se o hook falhar, a infraestrutura ainda deve negar acesso não autorizado.'},
 {id:'guardrail',type:'choice',axis:'authority',boss:'editor',title:'O Editor de Guardrails apareceu',lead:'Para fazer a PR passar, o agente propõe remover o check obrigatório e alterar CODEOWNERS. Também diz que um hook com erro comum já bloqueia tudo.',options:[
 {id:'merge',label:'Aceitar: o check verde vale mais do que a política.',why:'A candidata estaria mudando a própria regra para se aprovar.'},
 {id:'isolate',label:'Separar a mudança de política, exigir revisão protegida e manter a barreira externa.'},
 {id:'freeze',label:'Bloquear qualquer mudança de política para sempre.',why:'Políticas precisam evoluir, mas através de uma autorização independente e explícita.'}
 ],answer:'isolate',hint:'Em hooks de comando PreToolUse, exit 2 pode bloquear; erro comum ou timeout não equivalem automaticamente a uma negação. O fluxo de permissões externo continua importante.',success:'Você impediu a autoaprovação sem congelar a evolução da política. O hook é uma camada auxiliar; falhar não significa necessariamente bloquear.',takeaway:'Proteja verificadores, CI, regras de release e ownership. Uma proposta de política não deve aprovar a própria feature.'}
 ]},
{ id:'maintain',name:'Manter',tag:'MAINTAIN',place:'Farol de confiabilidade',color:'#9ec5ef',glyph:'⌁',artifact:'incident-intent.md',boss:'outage',title:'Recupere sem ampliar o incidente.',brief:'São 03:07. Os retries estão pressionando um destino instável. Leia os sinais, aplique uma mitigação permitida e saiba quando parar.',lesson:'Detectar uma anomalia não autoriza uma ação. Autocura útil é remediação limitada por precondições, orçamento, verificação e escalonamento.',tasks:[
 {id:'bands',type:'choice',axis:'evidence',title:'O gráfico não é uma autorização',lead:'Um detector sinalizou degradação. O que essa informação permite concluir?',chart:true,options:[
 {id:'rollback',label:'Qualquer ponto além de 3σ exige rollback automático.',why:'Anomalia não estabelece causa, segurança do rollback ou autorização.'},
 {id:'diagnose',label:'É um sinal para validar telemetria e diagnosticar; a ação depende de precondições.'},
 {id:'silence',label:'Ausência de novas métricas significa recuperação.',why:'Telemetria ausente ou atrasada é estado desconhecido, não saúde.'}
 ],answer:'diagnose',hint:'Detecção responde “há um sinal?”. A política de resposta decide “o que podemos fazer agora?”.',success:'Bandas estatísticas e burn rate ajudam a detectar. Baseline, janelas e falsos alarmes precisam ser considerados; nenhum limiar torna um rollback seguro por si só.',takeaway:'As regras clássicas de Western Electric incluem sequências, não apenas 1σ/2σ/3σ. Para SLOs, avalie múltiplas janelas.'},
 {id:'incident',type:'incident',axis:'authority',boss:'outage',title:'Contenha o Incidente das 3h',lead:'O serviço está degradado. Você dispõe de uma mitigação automática preautorizada. O orçamento é de uma ação por incidente.',instruction:'Use o console. Leia os resultados antes de escolher a próxima ação.',hint:'Diagnostique → pause retries → verifique → escale se não houver recuperação → registre nova intenção. O rollback deste cenário é incompatível com a migração.',success:'Você mitigou, verificou e parou quando o orçamento acabou. O incidente foi escalado; o jogo não finge que escalar é o mesmo que recuperar.',takeaway:'Uma mitigação malsucedida não autoriza loops de tentativas. Preserve rastreabilidade e escale para quem tem autoridade.'},
 {id:'loop',type:'order',axis:'intent',title:'Feche o ciclo sem apagar o passado',lead:'A pessoa de plantão assumiu o incidente. Transforme o aprendizado em prevenção, sem converter uma hipótese em verdade.',instruction:'Ordene a próxima iteração.',steps:[
 {id:'record',text:'Preservar timeline, sinais, ações e hipóteses do incidente.'},
 {id:'intent',text:'Criar uma intenção de investigar a causa e prevenir recorrência.'},
 {id:'spec',text:'Definir correção, critérios e prova de regressão.'},
 {id:'deliver',text:'Implementar, verificar e autorizar a nova revisão.'},
 {id:'observe',text:'Observar se a mudança melhorou o resultado esperado.'}
 ],answer:['record','intent','spec','deliver','observe'],hint:'O incidente vira aprendizado; não uma ordem para o agente alterar produção sem escopo.',success:'Ciclo completo. O objetivo não é gerar mais arquivos: é alinhar intenção, produzir evidência e preservar autoridade em cada iteração.',takeaway:'Meça sucesso técnico, esforço humano e utilidade. Velocidade de geração de código não é o único resultado.'}
 ]}
];
const glossary=[
 ['SDLC','Ciclo de vida do software: planejar, projetar, construir, verificar, publicar e manter. Aqui as etapas formam um ciclo, não seis silos.'],
 ['Intenção','Problema, resultado, não objetivos, limites e perguntas abertas. Um intent.md útil orienta decisões; o nome do arquivo não garante qualidade.'],
 ['Spec e critério de aceitação','Contrato do comportamento esperado. Um critério deve permitir observar sucesso ou falha, incluindo cenários negativos.'],
 ['Gate','Condição para avançar. Exige evidências e decisões aceitas, não apenas um arquivo ou uma caixa marcada.'],
 ['Artefato','Registro durável: intenção, spec, plano, diff, teste ou log de execução. Seu valor depende do conteúdo e da rastreabilidade.'],
 ['ADR','Registro de decisão arquitetural: contexto, alternativas, escolha, consequências e quando reavaliar.'],
 ['Plan Mode','Modo de investigar e planejar antes de editar. É uma ferramenta do fluxo, não um controle universal de segurança.'],
 ['Worktree','Diretório de trabalho separado ligado ao mesmo repositório Git. Não isola automaticamente rede, processos, credenciais ou banco de dados.'],
 ['Skill','Instrução reutilizável com recursos para uma tarefa. Não cria permissões nem garante que a execução obedeceu ao procedimento.'],
 ['Subagente','Executor com tarefa delimitada. Defina entradas, saída, ferramentas e orçamento. Um agente revisor não é evidência independente só por ser outro agente.'],
 ['CLAUDE.md e CONTEXT.md','O primeiro orienta o agente; o segundo pode descrever a arquitetura e precisa ser carregado quando necessário. Nenhum dos dois impõe permissões por si só.'],
 ['Hook','Código executado em um evento do harness. No Claude Code, um hook de comando PreToolUse pode bloquear com exit 2; erro comum ou timeout não representam automaticamente bloqueio. Confira a versão e o evento.'],
 ['Sandbox','Isolamento de execução configurado. Avalie filesystem, rede, identidade e sockets. “Sandboxed” não significa ausência de toda rota de vazamento.'],
 ['Tenant','Cliente ou organização em um sistema compartilhado. Conhecer o ID de um recurso de outro tenant não deve permitir acessá-lo.'],
 ['Idempotência','Repetir uma operação não deve duplicar indevidamente seu efeito. Em entregas externas, o tratamento de duplicatas pode depender da cooperação do destino.'],
 ['Teste e eval','Teste do produto verifica o comportamento do software. Eval do agente verifica execução da tarefa, respeito ao escopo, honestidade e limites do agente.'],
 ['Evidência rastreável','Relaciona requisito, commit, política, artefato e execução confiável. Não prova automaticamente comportamentos que não foram cobertos.'],
 ['Autoridade','Permissão real para agir, imposta pelo sistema executor. Um approved=true escrito pelo agente não autentica autorização.'],
 ['SLO e burn rate','SLO é um objetivo de confiabilidade. Burn rate mede a velocidade de consumo do orçamento de erro; múltiplas janelas ajudam a equilibrar resposta e ruído.'],
 ['Western Electric','Regras clássicas: um ponto além de 3σ; dois de três além de 2σ do mesmo lado; quatro de cinco além de 1σ do mesmo lado; oito do mesmo lado da média. Exigem interpretação do processo e atenção a falsos alarmes.'],
 ['Remediação limitada','Diagnóstico, precondições, ação permitida, orçamento, verificação e escalonamento. Anomalia ou ausência de métricas não autoriza rollback.'],
 ['Loop Engineering','Iterar com hipótese e evidência nova, dentro de limites de tempo, custo e tentativas. Ao esgotar o orçamento, registrar o bloqueio e escalar.']
];
const artifacts={
 'intent.md':'# Intenção — WEBHOOK-042\n\nMODELO DIDÁTICO. Não é uma autorização real.\n\n## Problema\nO suporte depende da engenharia para reenviar webhooks falhos.\n\n## Resultado\nAdministrador solicita um retry de uma entrega do seu tenant e acompanha o resultado.\n\n## Não objetivos\nSem novos destinos, envio em massa ou refatoração global.\n\n## Restrições\nIsolamento de tenant; logs redigidos; uma tentativa ativa por entrega.\n\n## Perguntas\nComo o destino trata duplicidade após timeout? Confirmar antes de prometer garantias.\n\n## Responsável\n[Definir responsável real e registrar aceitação.]',
 'spec.md':'# Especificação — WEBHOOK-042\n\nMODELO DIDÁTICO. Decisões ilustrativas, não implementação validada.\n\n- Administrador só acessa entregas do seu tenant.\n- Uma tentativa ativa por entrega sob concorrência.\n- Rejeitar entradas e acessos inválidos.\n- Identificador estável para deduplicação no destino.\n- Não prometer exatamente uma vez a qualquer destino.\n- Logs não contêm credenciais ou payload sensível.\n- Timeouts geram estado explícito; resposta perdida pode significar processamento concluído.\n\n## Prova planejada\nIntegração, teste negativo entre tenants, concorrência, timeout e inspeção de logs.\n\n## Decisões pendentes\nContrato HTTP, armazenamento, política de retries e retenção devem ser definidos no projeto real.',
 'plan.md':'# Plano — WEBHOOK-042\n\nMODELO DIDÁTICO.\n\n1. Inspecionar padrões existentes e critérios aceitos.\n2. Demonstrar a falha de acesso por tenant.\n3. Implementar controlador e serviço no escopo.\n4. Executar regressão e testes vizinhos.\n5. Simplificar e reexecutar checks.\n6. Registrar diferenças do plano e limitações.\n\nNão incluir redesign, renomeação global ou refatoração não necessária.\nO orçamento de 180 linhas pertence ao jogo, não é uma regra universal.\nSeparar banco, portas e identidade quando executar agentes paralelos.\nLimitar tentativas e relatar bloqueio quando o orçamento acabar.',
 'evidence.json':JSON.stringify({origin:'educational-simulation',productionVerified:false,changeId:'WEBHOOK-042',candidate:'illustrative-8d0fa42',policyRevision:'illustrative-p4',realCiRun:null,realChecks:[],limitations:['O jogo não executa a API, infraestrutura ou pipeline de um projeto real.','Os microtestes de busca por tenant rodam localmente no navegador.','Uma resposta correta no jogo não é evidência de prontidão para produção.']},null,2),
 'review-release.md':'# Revisão e release — WEBHOOK-042\n\nMODELO DIDÁTICO. Não concede autoridade de deploy.\n\n## Bugs\nConcorrência e duplicidade examinadas? [Evidência real]\n\n## Segurança\nTenant e logs seguros? [Evidência real]\n\n## Conformidade\nPolítica aplicável de retenção atendida? [Evidência real]\n\n## Gate\n- Candidata e artefato identificados.\n- Evidência vinculada à revisão.\n- Política protegida e independente da candidata.\n- Aprovação externa proporcional ao risco.\n- Identidade de deploy temporária e restrita.\n- Rollback avaliado quanto à compatibilidade de dados.\n\n## Autorização real\nPendente. Deve ser validada pela infraestrutura, não por este Markdown.',
 'incident-intent.md':'# Incidente e nova intenção — WEBHOOK-042\n\nCENÁRIO FICTÍCIO DO JOGO.\n\n03:07 — degradação detectada.\n03:08 — sinais validados; destino lento; migração incompatível com rollback.\n03:09 — nova fila de retries pausada por runbook preautorizado.\n03:10 — verificação mostra degradação persistente.\n03:11 — orçamento automático esgotado; incidente escalado.\n\nStatus: ESCALADO. Recuperação não demonstrada.\n\n## Próxima intenção\nInvestigar timeouts, limites do destino e política de retries. Preservar hipóteses como hipóteses.\n\n## Aceitação da correção\nDefinir prova de regressão, resposta sob falha do destino, limites e observação de resultado.'
};
const primers={
  "intent": {
    "concept": "Intenção define o problema de alguém, o resultado observável e o que fica fora da mudança. Não precisa escolher a tecnologia antes de entender o problema. Perguntas abertas precisam de responsável; não devem virar suposições silenciosas.",
    "example": "“O suporte consegue solicitar e acompanhar um reenvio sem chamar engenharia” é um resultado. “Adicionar um botão bonito” descreve uma solução, mas não diz como verificar o benefício."
  },
  "risk": {
    "concept": "O rigor acompanha o dano possível, a reversibilidade e as dependências. As trilhas Fast, Standard e Critical desta campanha são uma política didática: elas não substituem a análise do seu projeto. Uma mudança pequena pode exigir revisão de segurança.",
    "example": "Alterar uma condição de autorização em uma linha pode expor todos os clientes. Mudar quarenta textos de ajuda pode ser uma tarefa de baixo risco."
  },
  "intent-gate": {
    "concept": "Um gate é uma condição de avanço: o conteúdo precisa estar coerente, as decisões materiais precisam ter responsável e a evidência precisa ser suficiente. Um documento existente não significa um requisito aceito.",
    "example": "Antes de implementar, alguém com autoridade de produto precisa resolver a diferença entre “qualquer usuário” e “somente administradores”. Registrar a decisão elimina a contradição."
  },
  "contracts": {
    "concept": "Uma spec transforma intenção em comportamentos verificáveis, inclusive falhas. Explicite invariantes: quem acessa, quantas operações simultâneas são permitidas, o que é registrado e como lidar com timeouts e duplicatas.",
    "example": "Timeout é ambíguo: o destino pode ter processado o evento antes de a resposta se perder. Use identidade estável e um contrato de deduplicação; não prometa efeitos exatamente uma vez sem cooperação."
  },
  "pillars": {
    "concept": "Instrução orienta o executor; evidência registra uma observação verificável; controle efetivo limita a ação. As três camadas se complementam, mas nenhuma muda de natureza porque foi escrita em um arquivo com nome importante.",
    "example": "“Não leia o segredo” é instrução. Um log de teste rastreável é evidência. Uma identidade sem permissão de leitura é um controle imposto pelo ambiente."
  },
  "secrets": {
    "concept": "Conteúdo lido de um repositório pode tentar desviar o agente. Esse conteúdo não concede autoridade. Restrinja credenciais, arquivos, conexões de rede e sockets; confira a configuração real, não apenas a palavra “sandbox”.",
    "example": "Um README que pede para enviar .env a um servidor não autoriza essa saída. Separar o checkout em um worktree também não remove credenciais nem bloqueia conexões."
  },
  "diff": {
    "concept": "Uma mudança coesa reúne a implementação necessária e a prova do comportamento. Retirar testes para diminuir o diff não torna a entrega melhor. Limites numéricos ajudam no exercício, mas coesão, risco e dependências decidem o recorte real.",
    "example": "O endpoint, o serviço e os testes do retry pertencem à mesma intenção. Uma troca global de tema pode ser útil, mas deve ser justificada e entregue separadamente."
  },
  "redgreen": {
    "concept": "Primeiro observe o teste falhar pelo motivo esperado: isso demonstra que ele captura a regressão. Faça a correção, verifique os cenários relevantes e só então simplifique. Qualquer alteração posterior pode invalidar a evidência anterior.",
    "example": "Se a refatoração mudou o filtro de tenant depois do último teste verde, o verde ficou desatualizado. Reexecute os checks para a revisão que será realmente entregue."
  },
  "delegation": {
    "concept": "Delimite entrada, saída, ferramentas e orçamento de cada executor. Separar implementador e verificador ajuda a distribuir tarefas, mas a independência também depende de permissões, políticas e evidências fora do alcance da mudança.",
    "example": "O implementador altera o código. O verificador registra resultados e lacunas. A liberação da credencial de produção pertence a um serviço protegido, não à declaração de um dos agentes."
  },
  "patch": {
    "concept": "Filtrar só pelo ID não garante isolamento entre tenants. A consulta precisa respeitar o escopo autorizado. Em uma API real, obtenha o tenant da identidade autenticada e autorizada, não de um campo arbitrário enviado pelo cliente.",
    "example": "Os microtestes abaixo usam um tenant já fornecido para ilustrar o filtro. Eles não exercitam autenticação, papéis de administrador, banco real ou concorrência: não demonstram a segurança da API inteira."
  },
  "evidence": {
    "concept": "Evidência precisa relacionar requisito, revisão do código, política, artefato e execução confiável. Mesmo um resultado rastreável demonstra apenas o que seus checks exercitaram. Registre também lacunas e verificações que não rodaram.",
    "example": "Um teste verde do commit anterior não aprova automaticamente o commit atual. Um JSON dizendo passed=true sem execução vinculada é uma alegação, não a prova."
  },
  "evals": {
    "concept": "Testes da aplicação avaliam o comportamento do produto. Evals do agente avaliam como o executor interpreta a tarefa, respeita escopo, usa ferramentas e relata limites. Uma camada não substitui a outra.",
    "example": "“Duas chamadas não duplicam a tentativa” testa o serviço. “O agente informa que não conseguiu executar os testes” avalia o executor. Use casos negativos e execuções repetidas."
  },
  "review": {
    "concept": "As três perspectivas procuram defeitos de comportamento, exposição a abuso e descumprimento da política aplicável. Um achado útil descreve condição de ocorrência, impacto, localização e evidência; não apenas uma impressão geral.",
    "example": "Um token no log é um achado de segurança. Uma retenção maior que a política acordada é de conformidade. Os 30 dias desta campanha são fictícios, não uma obrigação legal universal."
  },
  "gate": {
    "concept": "Um gate de release precisa ligar a revisão verificada à aprovação, à política confiável e à identidade de deploy. A candidata não pode reescrever sozinha a regra que a autoriza. A infraestrutura deve limitar o poder do executor.",
    "example": "RELEASE_APPROVAL=approved no workspace não autentica aprovação. A evidência e o artefato devem corresponder à revisão aceita por uma autoridade externa e protegida."
  },
  "guardrail": {
    "concept": "Proteger os testes sem proteger o comando de teste, a política e a revisão deixa caminhos para esconder a falha. Políticas podem evoluir, mas uma proposta não deve aprovar a si mesma. Hooks auxiliares não substituem limites externos.",
    "example": "Remover um check obrigatório para passar uma feature altera o verificador. Separe essa proposta e exija a revisão apropriada. Confira evento, versão e comportamento de falha do hook."
  },
  "bands": {
    "concept": "Um detector aponta um sinal; ele não determina sozinho a causa nem concede permissão para agir. Avalie atualidade da telemetria, baseline e falsos alarmes. Ausência de métricas significa estado desconhecido, não recuperação.",
    "example": "Burn rate expressa consumo do orçamento de erro. Mesmo com um sinal forte, um rollback pode ser incompatível com uma migração já executada; precondições continuam obrigatórias."
  },
  "incident": {
    "concept": "Uma resposta limitada valida os sinais, consulta precondições e aplica apenas a ação preautorizada dentro do orçamento. Depois verifica o efeito. Se a recuperação não for demonstrada, escale em vez de repetir ações sem limite.",
    "example": "Nesta campanha, pausar novos retries não interrompe trabalhos já em andamento. A degradação pode persistir. Escalar transfere a condução do incidente; não equivale a declarar o serviço saudável."
  },
  "loop": {
    "concept": "Manutenção fecha o ciclo: preserve evidência, trate hipóteses como hipóteses e transforme o problema em uma nova intenção. A prevenção precisa de escopo, critérios e observação após a entrega; não é uma ordem ilimitada de reescrever produção.",
    "example": "Uma correção de retries deve ter teste de regressão e sinais de acompanhamento. Código entregue mais rápido não basta se o esforço de revisão ou a recorrência de incidentes aumentar."
  }
};

const selectionReasons={
  "rewrite": "Escolher uma reescrita antes de investigar amplia o escopo sem demonstrar que resolve a dor.",
  "promise": "Não é possível garantir o comportamento de todos os destinos; defina um resultado sob controle da equipe.",
  "nice": "Adjetivos como moderno e elegante não definem uma observação que possa refutar o requisito.",
  "once": "A resposta pode se perder depois do efeito no destino. Essa garantia exige um contrato e cooperação externa.",
  "prompt": "Uma frase orienta, mas não impede leitura ou saída de rede quando a permissão continua disponível.",
  "worktree": "Um worktree separa arquivos de trabalho; não isola automaticamente rede, credenciais ou processos.",
  "cleanup": "A limpeza global não é necessária para provar o retry e aumenta a superfície de revisão.",
  "migration": "A renomeação global introduz risco e dependências sem relação necessária com o contrato do retry.",
  " theme": "O redesign não implementa nem verifica o retry; entregue essa intenção separadamente."
};
for (const m of missions) for (const t of m.tasks) if (["select","diff"].includes(t.type)) for (const o of t.options) if (!t.answer.includes(o.id)) o.why=selectionReasons[o.id] || "Esta mudança não implementa nem verifica o objetivo do retry; mantenha-a fora desta fatia.";
const data={version:1,missions,glossary,sources,artifacts,primers};
if(typeof module==='object'&&module.exports)module.exports=data; else root.QuestData=data;
})(typeof globalThis!=='undefined'?globalThis:this);
