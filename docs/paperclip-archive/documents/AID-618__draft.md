<!-- issue: AID-618 | key: draft | doc_id: 0de83b74-1830-4334-97ab-57a11d73872c | updated: 2026-09-02 11:06:31.37+00 -->

# AID-618 — draft YAML lição l29 "Avalie as dependências sugeridas" (mod-05, chapterOrder 16, prereq [l22])

(AID-618)

# AID-618 — Draft YAML l29 "Avalie as dependências sugeridas" (T3, Onda O1)

**Status:** DRAFT de autoria CD pronto para landing FPE (autoria completa; a ordem de merge 14→15→16 é gate do landing, não da autoria). Especificação literal: spec AID-610 doc `spec` rev `51166a32` **§2.3** — variante **α DECIDIDA** pelo advisory CD AID-611 (`d683f18a`); template readiness AID-525 §2.1; convenções §2.3 sem exceções.

**Verificação executada (first-hand, árvore descartável fora do repo):** baseline = cópia do workspace @ T0 main `969c56c` + l27 já landed pela FPE (branch `aid-621/o1-t1-l27-landing`, arquivo idêntico ao draft T1 rev `8a48f478` — diff vazio) + l28/l29 `ready` simuladas → `tools/validate.py` verde: **"OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned"** (contagem pós-onda do spec §2); read model compilado (`--compile`) com l29 presente; paridade catálogo **6/6** contra a entrada §3.C (merged pelo T0); grep vendor-neutral limpo; 155 linhas (precedente dev l21/l22/l23/l27: 145–166).

**Landing FPE (padrão AID-591):** arquivo `modules/05-dev-contexto-e-escolha/l29-avalie-as-dependencias-sugeridas.yaml` (slug proposto, ajustável à convenção), flip `planned`→`ready`, binding `trackId: dev` / `chapterOrder: 16` / prereq `[l22]` / `unitId: ai-literacy:l29` / runtime literacyDojo (entrypoint `http://127.0.0.1:5178/?hosted=1`/`VITE_LITERACYDOJO_URL`/`protocolVersion "1.0"`/`contentVersion` vigente no merge) / evidence `literacy-evidence v1 / verifierRequired: true` / fallback DOM "Verifique manutencao, licenca, seguranca e alternativa nativa antes de adicionar a dependencia sugerida, por controles rotulados." — **SEM bump de contentVersion** (bump único `2026-09-02.2` já viajou com T1/l27). l29 é o **último** merge da onda (14→15→16).

```yaml
# Lição l29 — Onda O1 dev l27–l29 (spec AID-610 rev 2 §2.3): avaliar as dependências sugeridas pelo assistente.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l29
version: 1
moduleId: mod-05
title: "Avalie as dependências sugeridas"
objective: "Diante de uma biblioteca recomendada pelo assistente, verificar manutenção, licença, segurança e alternativa nativa antes de adicionar — e decidir com critério, não por popularidade."
estimatedMinutes: 4
skillIds: [codificar, avaliar]
prerequisites: [l22]

activities:
  - id: l29-a1
    type: choice
    skillId: avaliar
    instruction: "O ASSISTENTE SUGERIU ADICIONAR A BIBLIOTECA fmt-cpf PARA VALIDAR CPF NO FORMULÁRIO. Marque tudo o que você confere ANTES de aceitar."
    data:
      multiSelect: true
      options:
        - id: opt-manutencao
          text: "Se o projeto ainda é mantido: versão recente e issues respondidas"
        - id: opt-licenca
          text: "Se a licença permite usar no seu projeto"
        - id: opt-seguranca
          text: "Se há avisos de segurança publicados contra ela"
        - id: opt-alternativa-nativa
          text: "Se a sua linguagem já resolve o problema sem biblioteca nova"
        - id: opt-nome-facil
          text: "Se o nome do pacote é fácil de digitar"
        - id: opt-badges
          text: "Se o README tem badges bonitos"
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-manutencao, opt-licenca, opt-seguranca, opt-alternativa-nativa]
    feedback:
      onFailure: "Os cheques são manutenção, licença, segurança e alternativa nativa — popularidade e aparência não mantêm código. Nome fácil de digitar e badges bonitos dizem respeito à vitrine do pacote, não ao custo que ele traz para o seu projeto."
      perCheck:
        opt-manutencao: "Correta: biblioteca sem manutenção é dívida no dia em que o bug aparece — versão recente e issues respondidas dizem se alguém cuida dela."
        opt-licenca: "Correta: licença incompatível descoberta depois de integrar é retrabalho — conferir antes é uma busca, consertar depois é um processo."
        opt-seguranca: "Correta: avisos de segurança publicados existem para serem lidos antes de instalar, não depois do incidente."
        opt-alternativa-nativa: "Correta: se a linguagem já resolve, a dependência inteira é custo sem benefício — esta é a primeira pergunta."
        opt-nome-facil: "Não é cheque: nome fácil de digitar não corrige bug, não muda licença e não reduz o custo de manutenção."
        opt-badges: "Não é cheque: badges bonitos são apresentação — o que entra no seu projeto é o código e o histórico dele."
      onSuccess: "Exato: manutenção, licença, segurança e alternativa nativa — quatro cheques que popularidade nenhuma substitui. A dependência só entra se sobreviver aos quatro."
    storage:
      policy: structured_only
    hints:
      - "O que acontece com o seu projeto se essa biblioteca parar de receber correções?"
      - "Uma das opções olha para dentro da própria linguagem."
      - "Duas opções são sobre aparência."

  - id: l29-a2
    type: rubric_review
    skillId: codificar
    instruction: "O ASSISTENTE RECOMENDOU A BIBLIOTECA fmt-cpf ASSIM. AVALIE CADA CRITÉRIO: ATENDIDO, PARCIALMENTE ATENDIDO OU NÃO ATENDIDO?"
    data:
      responseText: "Use fmt-cpf — é a mais popular, não tem dependências e a licença é permissiva. Adicione com o gerenciador de pacotes e chame validar(campo)."
      criteria:
        - id: c-compara-com-alternativa-nativa
          text: "Compara com o que a linguagem já oferece antes de adicionar"
        - id: c-verifica-manutencao
          text: "Informa manutenção: versão recente, atividade, resposta a issues"
        - id: c-verifica-licenca
          text: "Informa a licença"
        - id: c-verifica-seguranca
          text: "Menciona avisos de segurança conhecidos"
        - id: c-escopo-da-dependencia
          text: "Declara tamanho/dependências que ela própria instala"
    evaluation:
      strategy: deterministic
      expectedVerdicts:
        c-compara-com-alternativa-nativa: not_met
        c-verifica-manutencao: not_met
        c-verifica-licenca: met
        c-verifica-seguranca: not_met
        c-escopo-da-dependencia: met
    feedback:
      onFailure: "Popularidade não é manutenção: a resposta cita licença e tamanho, mas não compara com a alternativa nativa nem olha manutenção e segurança — a decisão de adicionar dependência é sua."
      perCheck:
        c-compara-com-alternativa-nativa: "Não atendido: em nenhum momento a resposta pergunta se a linguagem já valida o campo sem biblioteca — a primeira comparação da decisão ficou de fora."
        c-verifica-manutencao: "Não atendido: 'a mais popular' não é versão recente nem issue respondida — popularidade mede adoção, não manutenção."
        c-verifica-licenca: "Atendido: 'a licença é permissiva' informa a categoria da licença — este critério aparece na resposta."
        c-verifica-seguranca: "Não atendido: nenhum aviso de segurança é mencionado — o silêncio da resposta não é evidência de ausência."
        c-escopo-da-dependencia: "Atendido: 'não tem dependências' declara o que ela própria instala — o escopo está dito."
      onSuccess: "Vereditos certos: licença e escopo aparecem — e popularidade não vira manutenção nem segurança. O certo e o errado no mesmo trecho: a decisão de adicionar continua sua."
    storage:
      policy: structured_only
    hints:
      - "Quais dos cinco critérios a resposta menciona de fato — e quais ela só pressupõe?"
      - "'A mais popular' responde a qual critério? A qual não responde?"
      - "Procure na resposta: versão recente, issues, avisos de segurança, comparação com a linguagem. O que aparece?"

  - id: l29-a3
    type: missing_context
    skillId: avaliar
    instruction: "UM COLEGA VAI ADICIONAR A BIBLIOTECA SUGERIDA 'PORQUE É A MAIS POPULAR'. O que falta no plano dele?"
    data:
      prompt: "COLEGA (plano): 'Adiciono fmt-cpf, chamo validar(campo), commito.' · VOCÊ: 'Por que essa?' · COLEGA: 'É a mais popular.' — nada mais foi verificado antes do commit."
      contextOptions:
        - id: manutencao-atual
          text: "A manutenção atual: se há versão recente e issues respondidas"
        - id: licenca-do-pacote
          text: "A licença do pacote: se ela permite usar no projeto"
        - id: avisos-de-seguranca
          text: "Avisos de segurança publicados contra a biblioteca"
        - id: tamanho-do-pacote
          text: "O tamanho do pacote e as dependências que ele próprio instala"
        - id: quantidade-de-estrelas
          text: "A quantidade de estrelas do repositório"
        - id: ano-de-criacao-do-repositorio
          text: "O ano de criação do repositório"
    evaluation:
      strategy: deterministic
      requiredContextIds: [manutencao-atual, licenca-do-pacote, avisos-de-seguranca]
      optionalContextIds: [tamanho-do-pacote]
    feedback:
      onFailure: "'É a mais popular' não é plano de engenharia: manutenção, licença e segurança são os cheques que faltam antes do commit. Estrelas e ano de criação não dizem nada disso — um mede popularidade, o outro mede idade, nenhum mede cuidado."
      perCheck:
        manutencao-atual: "Faltou isto: manutenção — versão recente e issues respondidas dizem se a biblioteca tem quem cuide dela."
        licenca-do-pacote: "Faltou isto: a licença — descobrir incompatibilidade depois do commit é o retrabalho mais caro do atalho."
        avisos-de-seguranca: "Faltou isto: avisos de segurança — conferir antes é uma busca; descobrir depois é um incidente."
        tamanho-do-pacote: "Isto é opcional: tamanho e dependências transitivas completam o juízo, mas o plano não nasce errado sem isso."
        quantidade-de-estrelas: "Isto não é cheque: estrelas são popularidade — o mesmo critério que o colega já usou e que não mantém código."
        ano-de-criacao-do-repositorio: "Isto não é cheque: idade não é manutenção — projeto antigo pode estar abandonado há anos."
      onSuccess: "Exato: manutenção, licença e segurança antes do commit — o tamanho completa o juízo. Estrelas e ano de criação continuam sem dizer quem cuida do código que você adotou."
    storage:
      policy: structured_only
    hints:
      - "Quantos dos quatro cheques de dependência o plano do colega citou?"
      - "Estrelas medem popularidade; ano mede idade. Onde está a informação sobre quem mantém o código hoje?"

rubric:
  id: l29-rubric
  criteria:
    - id: r-verifica-antes-de-adicionar
      text: "Verifica manutenção, licença e segurança antes de aceitar a dependência sugerida."
      weight: 1
    - id: r-compara-com-alternativa-nativa
      text: "Pergunta se a linguagem já resolve antes de adicionar biblioteca nova."
      weight: 1
    - id: r-decide-com-criterio
      text: "Aceita, recusa ou substitui com motivo — nunca só por popularidade."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l29-a1, l29-a2, l29-a3]
```
