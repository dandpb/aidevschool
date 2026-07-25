# Mapear a experiência AI DevSchool para duas trilhas

Label: wayfinder:map

## Destination

Uma especificação de produto e aprendizagem pronta para handoff, definindo como o AI DevSchool
atende pessoas não tecnológicas e programadores por duas trilhas distintas, com um ciclo
pedagógico comum, assistentes de IA, gamificação, linguagem voxel, evidência e um primeiro
lançamento verificável.

## Notes

- Domínio: educação prática em IA para dois públicos.
- **Missão declarada por Daniel:** democratizar o ensino de IA — simples para pessoas não
  tecnológicas e também para programadores.
- **Modelo de referência: Duolingo.** Pequenas lições, gameficação e progressão em passos curtos
  são a pegada de produto pretendida, não apenas um sabor visual. Toda decisão de topologia,
  progressão e gamificação deve ser julgada contra essa referência — inclusive onde ela NÃO serve
  (o gate exige evidência executável; Duolingo não tem equivalente disso).
- **Assistentes de IA e voxel art são meios de explicação**, subordinados às pequenas lições: o
  design bonito serve à compreensão do conceito, não o contrário.
- Skills para as sessões: `grilling`, `domain-modeling`; usar `prototype` quando o ticket pedir
  reação a uma experiência visual.
- **IA na Prática** é a trilha voltada a pessoas não tecnológicas e continua apoiada por AI
  Literacy e LiteracyDojo.
- **Trilha Dev** é uma rota de produto para programadores, não uma engine. Ela deve compor somente
  curriculum e engines já existentes. A recomendação inicial é usar codexDojo OS como entrada,
  sujeita à decisão do mapa.
- **Trilha** significa rota de aprendizagem apresentada à pessoa, não bounded context, engine ou
  estado de domínio.
- **Voxel art** é uma linguagem visual para explicar conceitos; não implica, por si só, carregar
  um runtime 3D.
- O mapa produz decisões e protótipos de decisão, não implementação.
- Daniel delegou o avanço às recomendações registradas durante o caminho e validará a solução
  integrada antes do handoff final.
- Estado operacional deve ser confirmado nas fontes canônicas de cada engine; intenção de produto
  não prova release.

## Decisions so far

- [Inventariar as engines disponíveis para a Trilha Dev](issues/01-inventariar-engines-da-trilha-dev.md)
  — 14 engines auditadas com testes executados (438 Python + ~680 JS verdes); a Trilha Dev se monta
  com 6 peças já comprovadas (Engine Hub do codexdojo-os-prototype, dojoToday, voxelDojo+pixelDojo,
  learner/gate+substrate, codexDojo, miniMaxEvolutionEngine ao fundo) sem engine nova. Maior lacuna:
  conteúdo, não superfície — 16 dos 19 projetos são `scaffolded` e a trilha só foi percorrida
  ponta a ponta uma vez.
- [Delimitar o contrato pedagógico compartilhado](issues/02-delimitar-o-contrato-pedagogico-compartilhado.md)
  — o ciclo já é contrato cross-surface (`docs/design/micro-lesson-contract.md`) com 12 invariantes
  compartilhados pelas duas trilhas (attempt-before-solution, produtor≠verificador, fail-closed,
  digest sem `ts`, gamificação nunca alimenta o gate). Divergem em: o que conta como evidência,
  onde mora o estado do aprendiz e **quem promove** — a trilha não-técnica tem verificador
  implementado e testado, mas nenhum consumidor do veredito.

## Not yet specified
- A identidade, os poderes, os limites e o uso opcional de modelos generativos pelos assistentes
  pedagógicos.
- Quais sinais de gamificação são compartilhados e quais permanecem locais a cada experiência.
- O sistema visual voxel: vocabulário, acessibilidade, produção de assets e quando usar ilustração
  estática ou simulação interativa.
- O recorte de conteúdo e a jornada completa que formarão o primeiro lançamento público.
- O formato da especificação integrada e da validação humana final, quando as decisões anteriores
  estiverem resolvidas.
- Se o gate G4 do ADR-0006 (scoring por LLM ancorado em rubrica, `Proposed`) chega a entrar no
  mapa. A skill `aiDevschoolMvp` ganhou suíte de testes depois da auditoria (7 passed), então a
  exclusão dela já não se sustenta por maturidade — resta que ela não usa `learner/gate` nem
  `learner/substrate`, ou seja, admiti-la significa herdar um quarto modelo de gate.

## Out of scope

- Criar uma nova engine para programadores ou reescrever as engines existentes.
- Fundir os bounded contexts das duas trilhas.
- Implementar o produto enquanto este mapa ainda estiver resolvendo decisões.
- Enfraquecer a separação entre tentativa, progresso local, evidência e domínio verificado.
