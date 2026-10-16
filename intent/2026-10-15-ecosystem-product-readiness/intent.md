# Intent: prontidão do ecossistema para o beta/piloto

Author: Daniel Barreto, discovery com Codex · Change-id: 2026-10-15-ecosystem-product-readiness · Status: accepted

> Pedido: “all critical issue to get the product redianess”, usando `heropa:sdlc-discover`.
> Recorte confirmado por Daniel em 2026-10-15: “Todos os engines do ecossistema”; “Pronto para o uso declarado”; “Main atual”; “Beta/piloto em construção”.

## Problem

O fundador precisa saber o que impede oferecer cada engine no uso que ele declara. Na main `f98e7fa32deac836addc348e185e8788fd197627`, dois contraexemplos locais demonstram falhas de integridade/verificação; seis claims de readiness estão stale; o inventário formal abrange seis dos quatorze engines. A ausência dos outros oito no inventário não demonstra defeito de runtime. Ainda não há uma qualificação atual do conjunto inteiro.

## Proposed outcome

Uma fila de trabalho sustentada por evidência, com prioridade para os dois defeitos reproduzidos, qualificação dos quatorze engines conforme suas promessas e renovação independente das claims afetadas. Só afirmar prontidão do conjunto quando todas as promessas incluídas estiverem comprovadas e não houver bloqueio crítico/alto aberto nesse escopo.

Esta discovery entrega o diagnóstico e a proposta de entrega em [design.md](design.md), com [evidências locais](evidence/manifest.json). Não representa implementação, aceite de um plano de engenharia ou prontidão já alcançada.

## Affected users and systems

Aprendizes, facilitadores e operador/fundador do piloto. Engines: `aiDevschoolMvp`, `codexDojo`, `codexdojo-os-prototype`, `dojoToday`, `literacyDojo`, `miniMaxEvolutionEngine`, `miniTown`, `minimaxDojo`, `openclaw`, `pixelDojo`, `school-entry`, `sdlc-quest`, `voxelDojo` e `zai-duolingo-like`. Dependências: `learner/`, `curriculum/`, `engines/shared/`, verificadores e serviços realmente usados por essas jornadas; `factory/` quando fizer parte de um fluxo declarado.

## Constraints

- Baseline: main atual, com SHA pinado por rodada. PRs e RCs abertos continuam trabalho em andamento.
- Cada engine é avaliado como aplicação web, tutor, protocolo ou ferramenta local, conforme sua promessa atual. Não converter todos em aplicações web nem conceder a todos o tier `customer-ready`.
- Preservar estado e histórico reais de aprendiz; usar dados temporários e perfis de teste separados.
- Produtor e verificador têm contextos distintos. Build, CI, observação local, deployment e aceite humano continuam provas separadas.
- Reaproveitar os PRs #657 e #656; nenhuma conclusão de revisão ou aprovação desses patches é concedida por esta discovery.
- Mudanças de produto exigem o plano aceito e as provas previstos pelo SDLC do repositório. Esta entrega não publica comentários, commits, PRs ou merges.

## Open questions

O comportamento real dos três engines dependentes de harness de chat/agentes precisa de um spike de qualificação com ambiente identificado. O encerramento, a pergunta e a consequência estão em `Needs a spike` de [design.md](design.md). O acesso e a versão dos deployments que entrarão no piloto precisam ser registrados antes de qualquer claim remota.

> Aceite de execução local: Daniel invocou explicitamente `heropa:sdlc-implement` para este plano nesta conversa. Exceção delimitada do teste #656: [registro humano](owner-approval-pr656.json). Publicação, push, deploy e merge permanecem ações separadas.
