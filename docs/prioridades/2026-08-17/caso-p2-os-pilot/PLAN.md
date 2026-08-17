# PLAN — deploy estático do piloto

## Plan Mode — diagnóstico

O código atual já contém a solução de empacotamento e um smoke de build estático não commitado no
working tree. O menor passo adicional desta rodada é retirar a dependência de `.env.production`
local, declarando os quatro valores no `netlify.toml`, e criar uma checagem do contrato.

## Etapas

1. Capturar o contrato do `netlify.toml` em `HEAD` como baseline.
2. Escrever o verificador e executar contra o baseline.
3. Declarar as quatro variáveis relativas no Netlify.
4. Executar o verificador contra o arquivo atual.
5. Rodar `npm run test:smoke:pilot`.
6. Registrar o que foi herdado do working tree e o que foi alterado nesta rodada.

## Não-metas

Não publicar, não instalar um backend, não alterar o catálogo de missões e não expandir o smoke
para todo o catálogo neste caso.
