# Intenção — WEBHOOK-042

MODELO DIDÁTICO. Não é uma autorização real.

## Problema
O suporte depende da engenharia para reenviar webhooks falhos.

## Resultado
Administrador solicita um retry de uma entrega do seu tenant e acompanha o resultado.

## Não objetivos
Sem novos destinos, envio em massa ou refatoração global.

## Restrições
Isolamento de tenant; logs redigidos; uma tentativa ativa por entrega.

## Perguntas
Como o destino trata duplicidade após timeout? Confirmar antes de prometer garantias.

## Responsável
[Definir responsável real e registrar aceitação.]