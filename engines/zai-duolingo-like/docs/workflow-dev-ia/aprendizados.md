# Aprendizados — revisão dos 11 workflows executados

> Síntese dos casos executados de verdade neste repo (caso 0 + W1–W10,
> 2026-08-19). Cada aprendizado vem de um rastro real — não é conselho
> genérico. Estado final do dia: 110 → 123 testes, lint 0, tsc 0, E2E 29/29,
> 2 bugs reais corrigidos, 1 bug de portabilidade corrigido, 2 vulnerabilidades
> de input identificadas e registradas.

---

## Aprendizado por workflow

### Caso 0 — Feature spec-first (meta semanal)

- **Previsibilidade é produto do contrato.** O resultado foi exatamente o que a
  spec prometeu (R1–R6 → 6 testes). A spec não "atrasou" o código; ela removeu
  a negociação durante o código.
- **O ambiente é o gate zero.** Antes de qualquer linha, `npm ci` falhou
  (lockfiles dessincronizados do package.json). O primeiro teste de um
  workflow é "a suíte roda neste ambiente?". Sem isso, nada mais existe.

### W1 — Bugfix por invariante

- **Invariante documentada pode ser aspiracional.** O módulo jurava "um
  timestamp único dirige o pipeline" enquanto 5 call sites usavam o relógio de
  parede. Leitura de código gera discussão; teste gera prova.
- **O teste red é a evidência.** A diferença de ~30min entre o clock injetado
  e o timestamp persistido encerrou qualquer debate sobre "isso é bug mesmo?".
- **Bug latente ainda é bug.** Invisível em produção hoje; real no primeiro
  replay, backfill ou teste com clock fixo.

### W2 — TDD de extração (lesson-unlock)

- **Teste antes do módulo desenha a interface.** Escrever os 11 testes contra
  o nada forçou a API pura (funções sobre shapes estruturais) antes do ruído
  de implementação. O módulo final tem ~37 linhas porque o contrato veio
  primeiro.
- **Comentário que confessa duplicação é backlog.** _"replicate unlock logic"_
  era o drift anunciado em texto. Esses comentários são a lista de refactors
  mais honesta do repo.
- **Suíte existente é caracterização.** Migrar os dois consumidores sem mudar
  um único teste provou preservação de comportamento — sem precisar re-derivar
  a regra na cabeça.

### W3 — Refactor seguro (helper de testes)

- **Refactor cria órfãos; lint é a rede.** Um arquivo definia o helper sem
  nunca chamá-lo — importar ali seria erro. Sem lint, o "refactor limpo" ganha
  dívida nova.
- **Verde antes / verde depois torna risco zero.** A mesma contagem de testes
  antes e depois É a prova de que nada de comportamento mudou.
- **Código de teste também duplica.** Helper repetido em 3 arquivos era dívida
  igual a qualquer duplicação em src.

### W4 — Code review do diff

- **Review que ignora untracked não vê código novo.** O capture do skill
  incluiu 13 arquivos novos que um `git diff` comum jamais mostraria. É onde
  reviews falham em silêncio.
- **Conteúdo gerado sai do review.** 1684 linhas de lockfile não merecem um
  segundo de atenção humana; separar sinal de ruído é parte do processo.
- **Finding bom tem destino.** Um foi corrigido na hora, o outro foi roteado
  para o W5. Finding sem dono é enfeite.

### W5 — E2E em máquina nova

- **Infraestrutura de teste também apodrece.** O caminho Windows
  `file:I:/Development/...` sobreviveu à mudança de máquina e impedia qualquer
  E2E. Config de teste é código — apodrece igual e merece review igual.
- **Falha em massa tem causa única.** 29/29 falhando = 1 causa. Reproduzir UM
  teste com verbose revelou o build do browser faltando; re-run cego só
  multiplicaria o mesmo erro 29 vezes.
- **Versão exata é contrato.** Playwright 1.62 exige o build 1234 do chromium;
  o cache tinha outros. "Quase certo" em ferramenta é errado.

### W6 — Delegação com brief

- **Delegar sem verificar é abdicar.** O relatório do subagente só virou
  finding depois que eu li os dois arquivos citados e confirmei linha por
  linha. A amostra verificada é o que transforma relatório em evidência.
- **Fronteiras no brief mantêm o paralelo seguro.** "Nenhum arquivo modificado"
  permitiu rodar a auditoria enquanto W1–W5 mudavam código — zero conflito.
- **Brief é hipótese, não roteiro.** O subagente corrigiu o próprio brief
  (`streak/touch` não existe; são 18 rotas, não 17). Brief bom deixa o agente
  reportar a realidade em vez de obedecer a suposição.
- **Finding registrado ≠ finding corrigido.** Os 2 problemas reais viraram
  próximos passos com dono — não um "aproveitei e corrigi tudo" fora de escopo.

### W7 — Loop de qualidade (any 4 → 0)

- **Sem medida não há progresso; sem parada não há loop.** O grep era o
  termômetro; "chegou a 0" foi a parada. Sem os dois, melhoria vira opinião
  sem fim.
- **O loop revela ativos esquecidos.** Os tipos `ClientLesson`/`ClientModule`
  já existiam em `types.ts` — medir antes de escrever evitou criar abstração
  duplicada.
- **Resistir ao scope creep é qualidade.** Parar em 0 (src) em vez de caçar
  `any` em testes e dependências foi a decisão correta, não preguiça.

### W8 — Health check de dependências

- **Auditoria produz decisão, não ação automática.** 17 outdated + 3 high na
  cadeia do Prisma — e a saída certa foi REGISTRAR, não upgradar no impulso.
- **Major upgrade é spec.** Corrigir a cadeia vulnerável exige mexer no
  Prisma 6: mudança com risco próprio, que precisa da suíte saudável como
  baseline (que agora existe). Saber ONDE está exposto > consertar no escuro.

### W9 — Decision records

- **Código diz o quê; nota diz por quê.** As duas notas criadas respondem
  daqui a 6 meses perguntas que git blame não responde.
- **Decisão rejeitada também é ativo.** O lifecycle `proposed →
  implemented/rejected` impede o time de re-litigar o que já foi decidido.

### W10 — Ativo permanente (npm run verify)

- **Sequência repetida manualmente vira comando, depois convenção.** Os gates
  rodavam como 3 comandos decorados; agora são 1 interface (`npm run verify`).
- **Ativo precisa de prova.** O script foi testado na hora (exit 0) — ativo
  não testado é promessa, não ferramenta.
- **Onboarding vira interface.** Uma pessoa ou agente novo roda UM comando e
  herda o mesmo padrão de qualidade do autor.

---

## Padrões transversais (o que se repetiu nos 11)

1. **Claim → Proof.** Todo workflow teve um momento em que algo afirmou ser
   verdade e um mecanismo provou: teste red antes do fix (W1), testes antes do
   módulo (W2), suíte antes/depois (W3), leitura do diff (W4), um teste para
   29 falhas (W5), inspeção das alegações do subagente (W6), re-medição (W7),
   rodar o ativo criado (W10). Nada entrou no repo por autoridade — entrou por
   evidência.

2. **Falha é dado, nunca motivo para retry no escuro.** As duas grandes falhas
   do dia (lockfiles, 29/29 E2E) foram resolvidas por diagnóstico de causa
   raiz, não por repetição. Cada retry cego teria custado tempo e escondido a
   causa.

3. **Uma coisa por fluxo.** Cada workflow entregou UMA coisa e registrou o
   resto como próximo passo. O "aproveitar e..." é como qualidade morre: o
   fix do cursor de `/api/activity` está registrado, não foi feito "de
   brinde" no meio do W6.

4. **Tudo vira ativo.** Testes, notas, templates, scripts, specs preenchidas.
   Qualidade que não é codificada se paga de novo a cada sessão; qualidade
   codificada compõe.

5. **O ambiente e a infraestrutura são parte do padrão.** Lockfile, config do
   Playwright, build do browser, path do banco. Nada disso é "só ambiente" —
   foi onde o dia mais ensinou.

---

## O principal

**Verificação independente de tudo que a IA produz.**

A IA acelera a geração — código, spec, review, auditoria saem em minutos.
Isso muda a economia, mas não muda o que "pronto" significa. O desenvolvedor
que usa IA com qualidade não é o que gera mais rápido; é o que desloca seu
trabalho de _escrever_ para _especificar e verificar_:

- contrato antes de código (a spec é o pedido);
- gate automatizado depois de cada passo (a prova);
- inspeção por amostra do que foi delegado (a auditoria da auditoria);
- registro real do resultado (a memória que impede autoengano).

Em uma frase: **a saída da IA é sempre uma hipótese; o workflow é o que a
transforma em fato.** Modelos mudam, harnesses mudam, skills mudam — a
disciplina de verificar é a única parte portátil do padrão de qualidade, e é
ela que permite trocar qualquer peça do stack sem perder o padrão.

### Checklist mínimo do dev (cole no seu dia)

```
[ ] Sei dizer o que "pronto" significa ANTES de pedir (spec/contrato)
[ ] Existe um teste que falha antes da mudança existir (ou a suíte como baseline)
[ ] O gate roda sozinho (npm run verify ou equivalente) — não depende de memória
[ ] Falhou? Diagnostiquei a causa; não dei retry no escuro
[ ] Deleguei? Verifiquei uma amostra das alegações
[ ] O resultado real (saída de comando) está registrado, não a intenção
[ ] O que aprendi virou ativo (teste, nota, script, template) — ou morre aqui
```
