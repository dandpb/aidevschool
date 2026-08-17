# PRD — Deploy estático do piloto do CodexDojo OS

## Problema

O OS educacional pode abrir uma missão usando um dev-server local, mas um build estático não pode
depender de `127.0.0.1`. Se isso acontecer, o usuário vê o shell e recebe uma missão morta.

## Usuário

Uma pessoa que abre o link publicado do piloto sem executar servidores locais.

## Objetivo

Servir o OS e as quatro origens de runtime do piloto no mesmo deploy estático, permitindo que as
missões IA Prática e Dev montem sem portas locais.

## Escopo

- build Netlify usa `npm run build:pilot`;
- quatro runtimes são empacotados em `dist/apps/`;
- quatro variáveis de URL apontam para subcaminhos do mesmo origin;
- smoke roda contra `vite preview`, sem dev-servers das missões;
- pelo menos uma missão de cada trilha monta e reporta a fronteira do verificador.

## Fora de escopo

- publicar uma nova URL nesta rodada;
- criar backend ou verificador remoto;
- ligar todas as 16 missões voxel;
- marcar mastery;
- afirmar que o piloto foi usado por uma pessoa real.

## Critérios de aceite

- [x] O build de produção empacota quatro runtimes.
- [x] A configuração Netlify não depende de `.env.production` local.
- [x] O iframe de cada caso smoke usa a origem do OS.
- [x] O conteúdo interno da missão é renderizado.
- [x] O estado “Ainda não enviada” permanece honesto sem verificador.

**Nota de release:** os arquivos de suporte do `build:pilot` e do smoke ainda estão não rastreados
no working tree desta rodada. O critério fica demonstrado localmente, mas o deploy só é
reprodutível depois que esses arquivos forem incluídos no commit/release.
