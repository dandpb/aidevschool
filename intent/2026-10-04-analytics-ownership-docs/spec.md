# Spec: responsabilidades e efeitos de analytics

Autorização e contexto: [intent.md](intent.md). Escopo: orientação documental.

## Critérios

1. Separar vocabulários de produto, emissores, transporte/collector, backing,
   staging, consumidores offline, schemas learner-events e cliente Python PostHog.
   Cada responsabilidade deve ter fonte existente; localização não concede mastery.
2. Identificar JSON como autoridade dos vocabulários, collector gerado e staging
   do OS como projeção. Não atribuir mesmo schema aos pipelines apenas por versão.
3. Explicitar efeitos: refresh sem `--check` reescreve blocos; build-pilot escreve
   staging/instala dependências; analytics Python inicializa via ambiente; comandos
   offline leem inputs e só escrevem nos destinos indicados. Não executar essas
   operações de escrita/runtime remoto neste recorte.
4. Distinguir agregados suprimidos de diagnostics de drift que podem carregar
   previews de valores. Analytics não é evidência nem promove mastery; configuração
   de transporte/deploy não é prova de disponibilidade live.
5. Adicionar uma entrada no handbook; preservar R5 e os documentos R1/R8.

## Política e limites

Aplicam-se AGENTS raiz/docs, REVIEW.md e SDLC local já lidos. A página é mapa
de comportamento existente: não altera prompts, gates, roadmap ou contratos,
portanto não modifica MANIFEST. Fonte: checkout no HEAD registrado, implementações
e configurações ligadas na página; ADRs são contexto datado, não prova live.

Os arquivos anteriores do Mac continuam indisponíveis neste ambiente. R7 não
depende deles. R2a, permissões de deploy e uma futura reorganização de analytics
ficam fora desta fatia. Nenhum commit, push, PR, merge ou deploy.
