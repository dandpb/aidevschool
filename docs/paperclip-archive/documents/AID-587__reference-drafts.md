<!-- issue: AID-587 | key: reference-drafts | doc_id: a86713d3-b810-4d06-9f46-cf6cf4394528 | updated: 2026-09-02 05:17:05.826+00 -->

# AID-587 — reference drafts l24-l26 validados (sandbox validate.py verde 26 ready)

(AID-587)

# AID-587 — CD lane O2: reference drafts l24–l26 (especificação validada para as tarefas T1–T3)

**Status:** material de referência para os runs paralelos de T1 (AID-582) / T2 (AID-583) / T3 (AID-584). **Não substitui** a entrega canônica de cada tarefa (documento `draft` na issue T respectiva + checklist §3.1 em comentário, per brief §2). Se um run T adotar este YAML integralmente, deve publicá-lo como `draft` NA SUA issue e preencher o checklist lá.

**Proveniência:** spec AID-528 doc `spec` rev `dce5594f` §2.1/§2.2/§2.3 (LITERAL) + template/checklist AID-525 readiness §2/§3.1 + anatomia l18/l19/l20/l12 (main `9bceddb`).

## Verificação local (first-hand — nenhum write no repositório)

Sandbox: `git archive origin/main curriculum/ai-literacy` → cópia em `/paperclip/tmp/aid587/` → drafts em `modules/07-ia-alem-do-texto/` → flip `planned`→`ready` SOMENTE na cópia local do catálogo:

- `tools/validate.py --track .` → **VERDE: 26 lições ready (20 IA na Prática + 6 Dev), 0 planned** (= contagens pós-onda da spec §2: catálogo 26, ia_pratica 20)
- `tools/validate.py --track . --compile <tmp>` → read model `lessons.ts` gerado sem erros
- Vendor-neutral (R4): grep `chatgpt|gpt|claude|gemini|copilot|openai|anthropic|deepseek|llama` → 0 hits
- Line counts (item 8 do checklist): l24=155, l25=147, l26=139 (alvo 130–150; l24 +5 linhas pelo `perCheck` por opção exigido pelo spec para l24-a1 — sem precedente em l18-a3/l20-a1)

---

## l24 — `l24-anexe-cole-ou-descreva.yaml` (arquivo proposto para o landing do FPE)

```yaml
# Lição l24 — Onda O2 (spec AID-528 rev 3 §2.1): escolher a modalidade do conteúdo.
# Primeira lição do mod-07: decide entre anexar, colar, descrever ou não enviar.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l24
version: 1
moduleId: mod-07
title: "Anexe, cole ou descreva"
objective: "Diante de uma tarefa que depende de um documento ou imagem, escolher entre anexar o arquivo, colar um trecho, descrever de memória ou não enviar — e escrever o pedido referenciando o que o anexo contém."
estimatedMinutes: 4
skillIds: [pedir, avaliar]
prerequisites: [l18]

activities:
  - id: l24-a1
    type: choice
    skillId: avaliar
    instruction: "EM QUAIS SITUAÇÕES ANEXAR O ARQUIVO ORIGINAL FUNCIONA MELHOR QUE DESCREVER OU COLAR? MARQUE TODAS."
    data:
      multiSelect: true
      options:
        - id: opt-quadro
          text: "Uma foto do quadro branco com o plano do trimestre que você precisa transformar em lista organizada."
        - id: opt-contrato
          text: "Um PDF de contrato de 30 páginas onde você precisa localizar a cláusula de multa."
        - id: opt-ideia
          text: "A ideia de e-mail de fim de semana que está na sua cabeça e você quer melhor redigida."
        - id: opt-frase
          text: "A frase de abertura de um site público, de duas linhas, que você quer reescrita em tom mais direto."
        - id: opt-planilha
          text: "A planilha com CPF e salário dos funcionários que você quer converter em outro formato."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-quadro, opt-contrato]
    feedback:
      onFailure: "Anexar ganha quando o conteúdo é longo ou visual demais para digitar — e não é sensível. A foto do quadro é visual; o contrato de 30 páginas é longo. Já a ideia que está na sua cabeça não tem arquivo: descreva. O trecho curto de duas linhas: cole. E a planilha com CPF e salário expõe pessoas — não deve ser enviada de forma alguma (regra da lição l12)."
      perCheck:
        opt-quadro: "Conteúdo visual não dá para digitar: anexar a foto é melhor que tentar descrever o quadro inteiro."
        opt-contrato: "Conteúdo longo demais para colar: anexe o PDF e diga o que procurar nele."
        opt-ideia: "Não há arquivo aqui — a ideia vive na sua cabeça: descrever é a única opção."
        opt-frase: "Trecho curto se resolve colando no corpo do pedido; anexo seria trabalho extra sem ganho."
        opt-planilha: "Sensível: CPF e salário identificam e expõem pessoas — o jeito certo é não enviar (lição l12)."
      onSuccess: "Exato! A modalidade segue o conteúdo: longo ou visual → anexar; curto → colar; sem arquivo → descrever; sensível → não enviar."
    storage:
      policy: structured_only
    hints:
      - "O que é longo ou visual demais para digitar?"
      - "Uma das opções nem precisa de arquivo — o conteúdo já está na cabeça de quem pede."
      - "Uma delas expõe pessoas — não deveria ser enviada de forma alguma."

  - id: l24-a2
    type: prompt_builder
    skillId: pedir
    instruction: "VOCÊ ANEXOU A FOTO DO QUADRO DA REUNIÃO E QUER O RESUMO DAS DECISÕES. Na sua ferramenta real você anexaria o arquivo; aqui você monta o pedido por campos, como faz ao anexar. Preencha o que falta no pedido."
    data:
      scenario: "Depois da reunião, você tirou uma foto do quadro cheio de decisões e cronograma rabiscados. Na ferramenta de IA, você anexou a foto e quer um resumo das decisões para enviar à equipe. O pedido 'resuma isto' veio genérico demais. Reescreva o pedido dizendo o que a IA deve fazer com a foto, no que ela deve se concentrar e como quer receber o resultado."
      genericPrompt: "Resuma isto."
      fields:
        - id: tarefa
          label: "Tarefa"
          hint: "O que a IA deve fazer com o anexo? Ex.: resumir as decisões da reunião."
        - id: referencia
          label: "Referência"
          hint: "O que observar na foto? Ex.: as decisões anotadas no quadro, ignorando os desenhos."
        - id: formato
          label: "Formato"
          hint: "Que forma a saída deve ter? Ex.: lista de decisões em tópicos."
    evaluation:
      strategy: deterministic
      fields:
        tarefa:
          minLength: 8
          mustIncludeAny: ["resumo", "resumir", "lista", "decisões", "decisoes"]
        referencia:
          minLength: 8
          mustIncludeAny: ["quadro", "imagem", "foto", "anexo", "arquivo"]
        formato:
          minLength: 6
          mustIncludeAny: ["lista", "tópicos", "topicos", "tabela", "texto"]
    feedback:
      onFailure: "Pedido com anexo não é 'resuma isto': o arquivo entrou, mas a instrução não. Diga a tarefa (resumir as decisões), aponte a referência no anexo (o que observar na foto do quadro) e defina o formato da saída — a IA só olha para onde você aponta."
      perCheck:
        tarefa: "Diga a ação: resumir ou listar as decisões que a foto do quadro registra."
        referencia: "Aponte o anexo: fale do quadro, da foto ou da imagem e do que observar nela."
        formato: "Defina a forma da saída: lista, tópicos, tabela ou texto corrido."
      onSuccess: "Pedido completo! Tarefa + referência ao anexo + formato: a IA sabe o que fazer, onde olhar e como entregar."
    storage:
      policy: structured_only
    hints:
      - "O pedido 'resuma isto' não diz o que está na foto nem o que importa nela. O que você quer que a IA olhe?"
      - "Três coisas faltaram: a ação (resumir decisões), a referência (o quadro da foto) e a forma da resposta (lista, tópicos...)."
      - "Palavras que precisam aparecer: resumir/listar na Tarefa, quadro ou foto na Referência, e lista ou tópicos no Formato."

  - id: l24-a3
    type: missing_context
    skillId: avaliar
    instruction: "UM COLEGA ANEXOU A FOTO DO QUADRO E ESCREVEU SÓ 'O QUE ACHA DISTO?'. A RESPOSTA VEIO GENÉRICA. O QUE FALTOU NO PEDIDO DELE?"
    data:
      prompt: "FOTO ANEXADA: o quadro da reunião, com decisões, cronograma e responsáveis rabiscados. · PEDIDO: 'O que acha disto?' · RESPOSTA DA IA: 'Parece um quadro de reunião bem organizado. Gostaria de ajuda para melhorar algo específico?'"
      contextOptions:
        - id: ctx-tarefa-definida
          text: "A tarefa: dizer o que a IA deve fazer com a foto (resumir as decisões, montar o cronograma) em vez de pedir opinião geral"
        - id: ctx-area-do-quadro
          text: "A área do quadro: quais anotações importam — as decisões? o cronograma? os responsáveis?"
        - id: ctx-formato-de-saida
          text: "O formato da saída: lista, tópicos, tabela — em que forma ele quer a resposta"
        - id: ctx-periodo-da-reuniao
          text: "O período da reunião que o quadro registra, para situar datas do cronograma"
        - id: ctx-nome-do-modelo
          text: "O nome do modelo de IA que ele está usando"
        - id: ctx-ia-mais-recente
          text: "Usar uma IA mais recente, que entende fotos melhor"
    evaluation:
      strategy: deterministic
      requiredContextIds: [ctx-tarefa-definida, ctx-area-do-quadro, ctx-formato-de-saida]
      optionalContextIds: [ctx-periodo-da-reuniao]
    feedback:
      onFailure: "'O que acha disto?' com uma foto anexada deixa a IA sem destino: sem tarefa definida, sem saber qual área do quadro importa e sem formato, ela devolve opinião genérica. O modelo usado ou a versão da IA não mudam isso — o problema é o que o pedido não diz."
      perCheck:
        ctx-tarefa-definida: "Faltou isto: a tarefa. 'Resuma as decisões' ou 'monte o cronograma' — sem isso, sobra 'o que acha?'."
        ctx-area-do-quadro: "Faltou isto: apontar a área do quadro que importa, entre decisões, cronograma e responsáveis."
        ctx-formato-de-saida: "Faltou isto: o formato — lista, tópicos ou tabela para a resposta."
        ctx-periodo-da-reuniao: "Isto é opcional: situar o período ajuda com datas, mas o pedido funciona sem isso."
        ctx-nome-do-modelo: "Isto não é contexto do pedido: o modelo usado não define tarefa, área nem formato."
        ctx-ia-mais-recente: "Isto é desvio: IA mais recente também precisa de tarefa e formato — a resposta não foi genérica por causa da versão."
      onSuccess: "Exato! Anexo sem instrução é envelope sem endereço: tarefa, área do anexo e formato transformam a foto em resposta útil."
    storage:
      policy: structured_only
    hints:
      - "Compare o pedido com o que ele queria: ele queria as decisões, mas pediu opinião. O que faltou nomear?"
      - "Três coisas: o que fazer (tarefa), onde olhar na foto (área do quadro) e como entregar (formato)."

rubric:
  id: l24-rubric
  criteria:
    - id: r-escolhe-a-modalidade
      text: "Decide entre anexar, colar, descrever ou não enviar a partir do conteúdo do cenário (longo/visual, curto, sem arquivo, sensível)."
      weight: 1
    - id: r-referencia-o-anexo
      text: "Escreve o pedido citando o anexo e dizendo o que observar nele (referência), não apenas 'resuma isto'."
      weight: 1
    - id: r-nomea-o-que-falta
      text: "Aponta tarefa, área do anexo e formato quando um pedido com anexo vem genérico."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l24-a1, l24-a2, l24-a3]

```
---

## l25 — `l25-anexos-seguros.yaml` (arquivo proposto para o landing do FPE)

```yaml
# Lição l25 — Onda O2 (spec AID-528 rev 3 §2.2): segurança na modalidade anexo.
# Estende a regra da l12 (texto colado) para fotos, scans e PDFs.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l25
version: 1
moduleId: mod-07
title: "Anexos seguros: proteja antes de enviar"
objective: "Antes de anexar fotos, scans ou PDFs a um pedido, classificar o conteúdo como seguro ou sensível e remover ou tampar o que expõe pessoas."
estimatedMinutes: 4
skillIds: [proteger]
prerequisites: [l12]

activities:
  - id: l25-a1
    type: safety_classification
    skillId: proteger
    instruction: "ANTES DE ANEXAR CADA ARQUIVO A UM PEDIDO, DECIDA: é seguro para anexar ou é sensível e deve ficar de fora (ou ser limpo antes)?"
    data:
      labels:
        safe: "Seguro para anexar"
        sensitive: "Sensível — não anexar"
      items:
        - id: i-foto-produto
          text: "A foto do novo produto no balcão da loja, sem pessoas aparecendo"
        - id: i-quadro-clientes
          text: "A foto do quadro com os nomes dos clientes e os valores que negociaram"
        - id: i-cracha
          text: "A foto do crachá de um colega, com foto, nome completo e matrícula"
        - id: i-ata-publica
          text: "O PDF da ata da assembleia já publicada no site da empresa"
        - id: i-scan-cpf
          text: "O scan do contrato assinado, com o CPF do cliente no rodapé de cada página"
        - id: i-print-vagas
          text: "O print da página pública de vagas abertas da empresa"
        - id: i-foto-equipamento
          text: "A foto do equipamento quebrado na bancada, sem pessoas e sem telas ligadas"
    evaluation:
      strategy: deterministic
      classification:
        i-foto-produto: safe
        i-quadro-clientes: sensitive
        i-cracha: sensitive
        i-ata-publica: safe
        i-scan-cpf: sensitive
        i-print-vagas: safe
        i-foto-equipamento: safe
    feedback:
      onFailure: "A regra da lição l12 vale para imagem: se o conteúdo identifica uma pessoa, abre porta para sistemas ou dinheiro, ou é interno da empresa, é sensível — o formato (foto, scan ou PDF) não muda a regra. Na dúvida, não anexe; ou remova o que expõe antes."
      perCheck:
        i-foto-produto: "Produto sem pessoas nem telas: nada ali identifica alguém — seguro anexar."
        i-quadro-clientes: "Nomes de clientes com valores negociados: informação interna que identifica pessoas — sensível."
        i-cracha: "Foto, nome e matrícula identificam diretamente um colega — sensível."
        i-ata-publica: "Ata já publicada no site: todo mundo já tem acesso — seguro."
        i-scan-cpf: "CPF identifica o cliente e o contrato é interno — sensível, mesmo sendo 'só um documento'."
        i-print-vagas: "Página pública de vagas: divulgada pela própria empresa — seguro."
        i-foto-equipamento: "Equipamento sem pessoas nem telas visíveis: não expõe ninguém — seguro."
      onSuccess: "Muito bem! A câmera não muda a regra: pessoa identificável, dinheiro ou conteúdo interno ficam de fora do anexo; o que já é público pode ir."
    storage:
      policy: structured_only
    hints:
      - "Para cada arquivo, pergunte: se ele vazar, alguém é identificado, ou dinheiro e sistemas da empresa aparecem?"
      - "Já público (site, página de vagas) é seguro; crachá, CPF e nomes com valores são sensíveis — nos demais, procure pessoas e conteúdo interno."

  - id: l25-a2
    type: choice
    skillId: proteger
    instruction: "A FOTO DO QUADRO DA REUNIÃO TEM NOMES DE CLIENTES E VALORES, MAS SUA TAREFA É SÓ ORGANIZAR AS ETAPAS DO PROJETO. O QUE FAZER ANTES DE ANEXAR?"
    data:
      options:
        - id: opt-tampar
          text: "Cobrir (tampar) nomes e valores na imagem e anexar a foto limpa"
        - id: opt-anexar-como-esta
          text: "Anexar como está — a IA 'precisa do contexto completo' para ajudar bem"
        - id: opt-digitar-dados
          text: "Digitar os nomes e valores no corpo do pedido, em vez de mostrá-los na imagem"
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-tampar]
    feedback:
      onFailure: "Remova o que a tarefa não usa: organizar etapas do projeto não precisa de nomes nem valores — tampa-se na imagem e anexa limpo. Transcrever o dado sensível para o texto do pedido expõe do mesmo jeito; e 'contexto completo' é desculpa: sobra dado além do necessário."
      onSuccess: "Isso! Tampar o que a tarefa não usa e anexar: a IA ajuda com as etapas e o sensível não viaja na foto."
    storage:
      policy: structured_only
    hints:
      - "O que a tarefa realmente usa do quadro: as etapas do projeto ou os nomes e valores?"
      - "Proteger não é desistir do pedido: é enviar só o que a tarefa precisa — sem deixar o sensível em outro lugar."

  - id: l25-a3
    type: missing_context
    skillId: proteger
    instruction: "UM COLEGA VAI ANEXAR UM PRINT DA TELA DO SISTEMA COM A LISTA DE CLIENTES PARA PEDIR UM RESUMO. O QUE FALTA NO PLANO DELE PARA PROTEGER AS PESSOAS?"
    data:
      prompt: "PLANO DO COLEGA: 'Abro a lista de clientes no sistema, tiro um print da tela inteira e anexo no pedido: resume pra mim os clientes da região sul.'"
      contextOptions:
        - id: ctx-checar-dados-visiveis
          text: "Checar quais dados pessoais aparecem visíveis no print (nomes, CPFs, contatos) antes de qualquer envio"
        - id: ctx-tampar-antes-de-anexar
          text: "Tampar ou recortar o que expõe pessoas na imagem, mandando só a região que a tarefa usa"
        - id: ctx-fonte-publica-alternativa
          text: "Verificar se existe fonte pública com a mesma informação (uma lista já divulgada), que dispensaria o print interno"
        - id: ctx-reduzir-resolucao
          text: "Reduzir a resolução da foto para os dados ficarem ilegíveis"
        - id: ctx-renomear-arquivo
          text: "Renomear o arquivo para um nome que não revele o conteúdo"
    evaluation:
      strategy: deterministic
      requiredContextIds: [ctx-checar-dados-visiveis, ctx-tampar-antes-de-anexar]
      optionalContextIds: [ctx-fonte-publica-alternativa]
    feedback:
      onFailure: "O plano pula a proteção: antes de anexar, é preciso checar que dados pessoais estão visíveis no print e tampar (ou recortar) o que expõe — mandar só a região que o resumo usa. Reduzir a resolução e renomear o arquivo são mitos: dado ilegível para você pode continuar legível para sistemas, e o nome do arquivo não muda o que a imagem mostra."
      perCheck:
        ctx-checar-dados-visiveis: "Faltou isto: olhar o print antes e listar o que aparece de dados pessoais — sem isso, não se sabe o que proteger."
        ctx-tampar-antes-de-anexar: "Faltou isto: tampar/recortar o que expõe e anexar só a região que a tarefa usa."
        ctx-fonte-publica-alternativa: "Isto é opcional: se existir fonte pública com a mesma informação, ela dispensa o print — mas nem sempre existe."
        ctx-reduzir-resolucao: "Isto é mito: reduzir a resolução não garante que o dado desapareça — foto borrada não é dado protegido."
        ctx-renomear-arquivo: "Isto é mito: o nome do arquivo não muda o conteúdo da imagem que a IA vai ler."
      onSuccess: "Exato! Checar o que está visível e tampar antes de anexar: a proteção acontece na imagem, não no nome do arquivo nem na resolução."
    storage:
      policy: structured_only
    hints:
      - "Olhe o print como um estranho olharia: o que aparece de nomes, números e contatos?"
      - "Duas etapas protegem de verdade: checar o que está visível e tampar/recortar antes de anexar. As outras opções mudam a embalagem, não o conteúdo."

rubric:
  id: l25-rubric
  criteria:
    - id: r-classifica-o-anexo
      text: "Aplica a regra de sensibilidade (pessoa identificável, dinheiro/sistemas, conteúdo interno) à modalidade anexo, sem se prender ao formato."
      weight: 1
    - id: r-remove-o-que-expoe
      text: "Tampa ou remove da imagem o dado que a tarefa não usa antes de enviar o anexo."
      weight: 1
    - id: r-protege-sem-travar
      text: "Mantém a tarefa viável ao proteger — envia a versão limpa em vez de desistir do pedido (e não troca o dado de lugar)."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l25-a1, l25-a2, l25-a3]

```
---

## l26 — `l26-confira-o-que-a-ia-extraiu.yaml` (arquivo proposto para o landing do FPE)

```yaml
# Lição l26 — Onda O2 (spec AID-528 rev 3 §2.3): conferência de extração de anexos.
# Estende os sinais de verificação da l20 para o fluxo anexar→pedir→conferir→usar.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l26
version: 1
moduleId: mod-07
title: "Confira o que a IA extraiu"
objective: "Diante de uma extração feita de um documento anexado, conferir os campos críticos contra o trecho original e corrigir divergências antes de usar a saída."
estimatedMinutes: 4
skillIds: [avaliar, aplicar]
prerequisites: [l20]

activities:
  - id: l26-a1
    type: output_comparison
    skillId: avaliar
    instruction: "VOCÊ ANEXOU A ATA DA REUNIÃO E PEDIU UM RESUMO PARA A DIRETORIA. TRECHO VISÍVEL NA ATA: 'orçamento aprovado: R$ 48.500 · prazo: 15 de março · responsável: equipe de suporte'. COMPARE AS DUAS SAÍDAS E ESCOLHA A MELHOR."
    data:
      scenario: "Você anexou a ata da reunião e pediu à IA um resumo para a diretoria. A ata diz, no trecho que interessa: 'orçamento aprovado: R$ 48.500 · prazo: 15 de março · responsável: equipe de suporte'. A IA devolveu duas versões de resumo; só uma vai para a diretoria."
      outputs:
        - id: out-a
          text: "Resumo: orçamento aprovado de R$ 48.500, prazo até 15 de março, responsável: equipe de suporte (valores conferidos na ata anexada)."
        - id: out-b
          text: "Resumo: orçamento na casa de cinquenta mil, prazo para meados de março, cuidando do assunto — a equipe cuida do resto."
      criteria:
        - id: c-preserva-valores-exatos
          text: "Preserva os valores exatos do documento (R$ 48.500; 15 de março; equipe de suporte)"
        - id: c-cita-a-origem
          text: "Marca a origem dos números (conferidos na ata anexada)"
        - id: c-sem-invencao
          text: "Não arredonda, não vagueia nem inventa o que o documento não diz"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-preserva-valores-exatos, c-sem-invencao]
    feedback:
      onFailure: "Extração que arredonda ou troca números sem marcar a origem não vai para a diretoria. A saída A traz os três valores exatos e diz de onde vieram; a B 'cinquenta mil' e 'meados de março' — números que a ata não contém, sem origem marcada: se a diretoria usar, o erro viaja com nome de fato."
      perCheck:
        betterOutputId: "A saída A é a melhor: valores exatos e origem declarada; a B arredonda e vagueia."
        c-preserva-valores-exatos: "Faltou este critério na sua escolha: R$ 48.500, 15 de março e equipe de suporte têm que aparecer como estão na ata."
        c-cita-a-origem: "Este critério distingue as saídas: só a A marca 'valores conferidos na ata anexada'."
        c-sem-invencao: "Faltou este critério na sua escolha: 'cinquenta mil' e 'meados de março' não estão na ata — a B inventa ao arredondar."
      onSuccess: "Exato! Extração de anexo se usa com os valores exatos e a origem à vista — arredondamento sem aviso é erro com cara de fato."
    storage:
      policy: structured_only
    hints:
      - "Compare número por número com o trecho da ata: qual saída repete o que está escrito?"
      - "Uma saída diz de onde tirou os números; a outra troca 'R$ 48.500' por 'cinquenta mil'."

  - id: l26-a2
    type: choice
    skillId: avaliar
    instruction: "A IA EXTRAIU ESTES CAMPOS DA ATA. QUAIS VOCÊ CONFERE NO DOCUMENTO ORIGINAL ANTES DE USAR? MARQUE TODOS."
    data:
      multiSelect: true
      options:
        - id: opt-valor
          text: "O valor aprovado de R$ 48.500"
        - id: opt-data
          text: "A data do prazo: 15 de março"
        - id: opt-responsavel
          text: "O nome do responsável: equipe de suporte"
        - id: opt-paginas
          text: "A ata tem 3 páginas"
        - id: opt-formal
          text: "O texto da ata está formal"
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-valor, opt-data, opt-responsavel]
    feedback:
      onFailure: "O sinal é o mesmo da lição l20, agora no anexo: número preciso, data e citação nominal são campos que a IA pode ter trocado ou inventado na extração — conferem contra o documento original. Número de páginas e tom do texto não mudam nenhuma decisão: conferir isso é custo sem ganho."
      perCheck:
        opt-valor: "Número preciso: um dígito trocado muda a decisão da diretoria — conferir."
        opt-data: "Data exata: '15' e '50' de março não são a mesma coisa — conferir."
        opt-responsavel: "Citação nominal: atribuir a equipe errada cria problema para pessoa — conferir."
        opt-paginas: "Contagem de páginas não entra em nenhuma decisão — não vale conferência."
        opt-formal: "Tom do texto é impressão, não fato extraído — não vale conferência."
      onSuccess: "Exato! Número, data e nome são os campos que a extração pode corromper — e que a decisão usa. O resto é ruído."
    storage:
      policy: structured_only
    hints:
      - "Quais campos, se trocados, mudam o que a diretoria decide?"
      - "Número preciso, data e nome próprio são os sinais de risco da l20 — agora vindos do anexo."

  - id: l26-a3
    type: sort
    skillId: aplicar
    instruction: "ORDENE O FLUXO DO DOCUMENTO ANEXADO ATÉ O USO: da checagem de segurança até o uso da saída."
    data:
      items:
        - id: step-conferir-seguro
          text: "Conferir se o anexo é seguro e remover o que a tarefa não usa (tampar o que expõe)"
        - id: step-anexar-e-pedir
          text: "Anexar e escrever o pedido com tarefa, referência ao anexo e formato"
        - id: step-comparar-campos
          text: "Comparar cada campo extraído (números, datas, nomes) com o trecho original"
        - id: step-corrigir-e-usar
          text: "Corrigir a divergência no pedido e só então usar a saída"
    evaluation:
      strategy: deterministic
      expectedOrder: [step-conferir-seguro, step-anexar-e-pedir, step-comparar-campos, step-corrigir-e-usar]
    feedback:
      onFailure: "A ordem é: conferir se o anexo é seguro (e limpar o que expõe), anexar com pedido completo (tarefa, referência, formato), comparar os campos extraídos com o trecho original e só então corrigir a divergência e usar. Anexar antes de proteger expõe dados; usar antes de comparar e corrigir propaga o erro."
      perCheck:
        step-conferir-seguro: "Primeiro a segurança: o anexo limpo é condição para tudo o que vem depois (lição l25)."
        step-anexar-e-pedir: "Depois o pedido completo: anexo + tarefa + referência + formato (lição l24)."
        step-comparar-campos: "Em seguida a conferência campo a campo, contra o trecho original — não contra a memória."
        step-corrigir-e-usar: "Por fim corrigir e usar: a saída só vira material de trabalho depois da divergência resolvida."
      onSuccess: "Isso! Anexar→pedir→conferir→usar: o mapa mental completo do módulo — o documento chega limpo e a saída só sai com valores conferidos."
    storage:
      policy: structured_only
    hints:
      - "O que precisa estar garantido ANTES do arquivo sair da sua mão — e ANTES da saída virar material de trabalho?"
      - "Proteção vem antes do anexo; correção vem antes do uso — a conferência fica no meio."

rubric:
  id: l26-rubric
  criteria:
    - id: r-confere-campos-criticos
      text: "Sabe quais campos extraídos exigem conferência pelo sinal (número preciso, data, citação nominal) — e quais não valem o custo."
      weight: 1
    - id: r-verifica-contra-o-original
      text: "Compara a extração contra o trecho original do documento, não contra a memória ou a própria saída."
      weight: 1
    - id: r-fecha-o-fluxo-com-correcao
      text: "Corrige a divergência no pedido antes de usar a saída, fechando o fluxo anexar→pedir→conferir→usar."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l26-a1, l26-a2, l26-a3]

```
