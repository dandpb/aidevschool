# AID-130 — reteste final da cadeia fail-fast

**Disposição:** GO condicionado ao processo normal de publicação  
**Severidade máxima aberta neste reteste:** nenhuma bloqueante  
**Data:** 2026-08-24 UTC

## Resultado executivo

O bloqueio de AID-125 foi removido. O build integrado compila OS, LiteracyDojo, WAREHOUSE,
WORMHOLE e RELAY STATION, promove um bundle completo e produz manifesto verificável. Os contratos
negativos impedem bundle parcial, alteração posterior ao manifesto e spawn de deploy sobre conteúdo
incompleto. Nenhum deploy Netlify real foi executado.

Veredito de QA: **GO** para o fluxo normal de publicação, sujeito às credenciais, controles e
validação pós-deploy do proprietário da release. Este aceite cobre o candidato local e a receita
versionada; não comprova execução dentro da imagem Netlify/Node 22 nem saúde do endpoint publicado.

## Charter baseado em risco

1. Caminho feliz: todas as cinco superfícies devem compilar e gerar bundle íntegro.
2. Atomicidade: falha de promoção deve restaurar o bundle anterior.
3. Integridade: superfície ausente, arquivo alterado ou inventário divergente devem bloquear deploy.
4. Jornadas críticas: learner local, verificação independente, offline, segurança, acessibilidade e
   fallbacks não podem regredir.

## Ambiente

- Workspace compartilhado, branch `main`, árvore com alterações preexistentes de múltiplos autores.
- Node `v24.18.0`, npm `11.17.0`.
- Dependências já materializadas; receita versionada Netlify declara Node 22 e inclusão de
  `devDependencies`.
- O ambiente do executor herdava `NODE_ENV=production`; para Vitest/Playwright foi usado
  `NODE_ENV=test`, conforme o modo de teste esperado.
- Estado canônico do learner não foi editado.

## Evidência reproduzível

| Comando | Resultado |
| --- | --- |
| `npm run test:pilot-bundle` | PASS — 7/7 |
| `npm run build:pilot` | PASS — cinco superfícies compiladas; bundle promovido |
| `node --input-type=module -e "...verifyPilotBundle('./dist')..."` | PASS — 5 superfícies, 27 arquivos |
| build com shim efêmero de `pnpm` retornando 42 no WAREHOUSE | PASS — build saiu 1; inventário + SHA-256 do `dist` ficaram byte a byte idênticos |
| harness com manifesto ausente e arquivo extra | PASS — ambos bloqueados antes do spawn (`spawned=false`) |
| `npm run lint` | PASS com 26 avisos de especificidade CSS; 0 erros |
| `NODE_ENV=test npm run test` | PASS — 43 arquivos, 218 testes |
| `NODE_ENV=test npm run test:smoke` | PASS — 62 passed, 10 skips esperados por viewport, 0 failed |

Manifesto verificado:

- `index.html` (OS)
- `apps/literacydojo/index.html`
- `apps/warehouse/index.html`
- `apps/wormhole/index.html`
- `apps/relay-station/index.html`

O `sourceRevision` do manifesto foi `local-uncommitted`, coerente com a árvore compartilhada sem
commit fechado. Isso precisa ser substituído por revisão rastreável no processo normal de release.

Na injeção de falha, OS e LiteracyDojo compilaram no staging; o shim de QA encerrou o primeiro
`pnpm` no WAREHOUSE com 42. O agregado abortou com status 1, removeu o staging e preservou todos os
bytes do `dist` publicável anterior. O shim foi removido após o teste.

## Triagem

- **Defeito bloqueante anterior — resolvido:** WAREHOUSE agora passa `tsc --noEmit` e Vite build.
- **Infraestrutura de teste — não bloqueante:** `npm run test` sob `NODE_ENV=production` falha em
  massa com `React.act is not a function`; sob `NODE_ENV=test`, 218/218 passam. A receita de build
  não depende dessa suíte e o smoke também passou no modo correto.
- **Dívida não bloqueante:** lint preserva 26 avisos de especificidade CSS; sem diagnóstico de erro.
- **Aviso de performance não bloqueante:** WORMHOLE e RELAY STATION geram chunks acima de 500 kB.

## Limitações e condição operacional

- Não foi executado `netlify deploy` e nenhuma credencial externa foi usada.
- O host local não reproduz Node 22/ambiente Netlify.
- O GO requer que o proprietário publique um commit/revisão identificável usando o diretório
  previamente verificado e execute validação pós-deploy do endpoint. Qualquer mudança posterior no
  candidato invalida este aceite e exige novo reteste focado.

## Reconciliação da reabertura

O comentário `910ac706-e589-4d15-ba93-4b0bdd977a8f` foi revisado em 2026-08-24 UTC. Ele confirma,
sem introduzir resultado conflitante, a falha injetada no WAREHOUSE (`pnpm` retornando 42), a saída
1 do agregado, a identidade byte a byte do `dist` anterior e os bloqueios pré-spawn para manifesto
ausente e inventário divergente. Assim, não há nova lacuna de QA nem motivo para reabrir execução:
a disposição permanece **GO**, com as mesmas condições operacionais acima, e AID-130 permanece
`done`.
