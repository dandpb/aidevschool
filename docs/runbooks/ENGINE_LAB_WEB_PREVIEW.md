# Engine Lab — publicação do preview web

## Preview atual

- Hub estável: `https://aidevschool-engine-lab-preview.netlify.app/desktop`
- Deploy do Hub: `6a73694777b0670752c9d0cc`
- Origem dos runtimes: `https://aidevschool-engine-runtimes-preview.netlify.app`
- Deploy dos runtimes: `6a735e86667d2f0f6fcf2836`
- Publicado em: 2026-08-05
- Estado: Hub, cinco apps principais e as 16 experiências voxel respondem HTTP
  200; o primeiro asset versionado de cada runtime também respondeu HTTP 200.
- O bundle do Hub contém as URLs da origem de runtimes para codexDojo,
  LiteracyDojo e todo o catálogo voxel.
- minimaxDojo, MiniMax Evolution Engine, OpenClaw e AiDevSchool MVP possuem
  demonstradores web interativos e somente leitura. Eles percorrem os contratos
  declarados, mas deixam explícito que não executam os motores Python.
- Z.ai Duolingo-like está inventariada, porém indisponível: o caminho versionado
  é um gitlink `81098710d24600149ba2aae62b605cbab00e7cc7` sem `.gitmodules`, URL
  remota ou objeto recuperável. Não há runtime honesto para publicar até a origem
  ser restaurada.
- Limite: a aceitação visual/interativa ainda requer execução independente em
  navegador Chromium funcional. A verificação atual cobre publicação, roteamento
  e integridade inicial dos assets, não a jornada completa dentro de cada engine.

Este é um draft `noindex`, não o URL principal do site e não uma promoção de
produção.

## Resultado esperado

Um site Netlify para o OS/Hub e uma segunda origem para os runtimes web, cada
engine empacotada sob um prefixo de caminho próprio. A origem separada preserva
o sandbox entre o Hub e o conteúdo incorporado; os limites de código, build e
estado de cada engine continuam independentes. A publicação é um preview
técnico: não prova release, relevância pedagógica ou mastery.

## Sites e diretórios-base

| Site | Base directory | Build | Variável no Hub |
| --- | --- | --- | --- |
| Engine Lab | `engines/codexdojo-os-prototype` | `npm run build` | — |
| codexDojo | `engines/codexDojo` | `pnpm run build` | `VITE_CODEXDOJO_URL` |
| LiteracyDojo | `engines/literacyDojo` | `npm run build` | `VITE_LITERACYDOJO_URL` |
| miniTown | `engines/miniTown` | `pnpm run build` | `VITE_MINITOWN_URL` |
| dojoToday | `engines/dojoToday` | configuração `netlify.toml` própria | `VITE_DOJOTODAY_URL` |
| PixelDojo | `engines/pixelDojo/pixel-quest` | `pnpm run build` | `VITE_PIXELDOJO_URL` |
| voxelDojo | um site por experiência escolhida | build do package | `VITE_VOXELDOJO_URLS` |

Para esta avaliação remota, as 16 experiências voxel existentes foram
publicadas. Catálogo acessível não implica catálogo de release.

## Ordem segura

O bundle integrado do piloto deve ser criado com `npm run build:pilot`. O comando
monta todas as superfícies em uma área temporária e só substitui `dist/` depois
que as cinco entradas e o inventário tiverem sido registrados em
`pilot-bundle-manifest.json`. Qualquer build que falhar preserva o último `dist/`
completo. Publique exclusivamente com `npm run deploy:pilot -- <opções Netlify>`;
esse comando recusa manifesto ausente, entrada alterada ou inventário parcial e
sempre chama o Netlify com `--no-build`.

No bundle integrado, LiteracyDojo é compilado com base
`/apps/literacydojo/`. Seu worker deve existir em
`/apps/literacydojo/sw.js` e controlar somente esse prefixo; `/sw.js` na raiz
do OS não é uma rota válida. A verificação do manifesto bloqueia a publicação
se o artefato escopado estiver ausente.

1. Criar previews separados dos runtimes e guardar suas URLs públicas.
2. Configurar no site do Hub apenas as URLs aprovadas acima. Exemplo:

   ```text
   VITE_CODEXDOJO_URL=https://...
   VITE_LITERACYDOJO_URL=https://...
   VITE_MINITOWN_URL=https://...
   VITE_DOJOTODAY_URL=https://...
   VITE_PIXELDOJO_URL=https://...
   VITE_VOXELDOJO_URLS={"game-10-hash-ring":"https://..."}
   ```

3. Fazer novo deploy do Hub; variáveis Vite são incorporadas no build.
4. Abrir `/desktop` → **Atividades** → **Engine Hub** e testar cada cartão.
5. Executar `npm run engine-lab:smoke` contra a topologia publicada em runner
   com Chromium funcional.
6. Confirmar que `learner/learning_state.yaml` e projeções canônicas não mudaram.

## Segredos e dados

- Não inserir token Netlify, chave de verificador ou segredo em variável
  `VITE_*`: tudo com esse prefixo vai para o bundle público.
- O Hub estático não habilita a ponte Python local.
- Analytics e verificação remota continuam desabilitados até aprovação de
  retenção, região e deleção.
- Um preview público deve usar URL não promovida e rollback pelo deploy anterior.

## Próxima verificação independente

Executar `npm run engine-lab:smoke` apontando para os dois sites publicados em
um runner com Chromium funcional. O verificador deve abrir cada cartão, iniciar
o runtime, registrar sucesso ou falha e confirmar que nenhuma engine escreveu
estado canônico ou atribuiu `mastered`.
