# PLAN — entrada pública

## Plan Mode — diagnóstico

Existe uma contradição entre a promessa de entrada do README e a rota verificada na visão do
produto. A correção mínima é atualizar uma seção do README e proteger o fato com um script.

## Etapas

1. Escrever o verificador textual.
2. Rodar contra o README do `HEAD` e observar RED.
3. Atualizar somente a seção contraditória do README.
4. Rodar o verificador atual.
5. Fazer uma chamada HTTP sem imprimir conteúdo sensível.
6. Registrar os limites: encontrabilidade não é uso nem aprendizagem.

## Não-metas

Não alterar a aplicação, não adicionar analytics e não usar esse teste para declarar product-market
fit.
