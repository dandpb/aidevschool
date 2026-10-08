# Spec — calculadora de tarifa de estacionamento (contrato do time de backoffice)

> Documento de intenção fornecido COM a sugestão de implementação.
> É a fonte de verdade da tarefa: a sugestão do assistente deve ser julgada
> contra ESTE contrato, não contra o que o código "parece" fazer.

## CONTEXTO

O estacionamento parceiro cobra por hora cheia (hora iniciada conta inteira),
com cortesia curta de entrada e um valor máximo por dia, para evitar fatura
absurda em pernoite. Toda fatura é emitida em **centavos (int)** — o sistema
financeiro não aceita ponto flutuante.

## OBJETIVO

`calcular_tarifa(minutos, tarifa_por_hora_centavos, teto_diario_centavos) -> int`
retorna o valor devido em centavos, aplicando, nesta ordem:

1. **Validação:** `minutos` negativo (saída registrada antes da entrada) deve
   lançar `ValueError` — erro de uso do chamador, não tarifa zero.
2. **Tolerância:** permanência de **até 15 minutos** (15 incluso) é cortesia:
   tarifa `0`.
3. **Hora iniciada:** acima da tolerância, cobra-se o número de horas
   **iniciadas** (teto de minutos por hora): 16 min = 1 h; 60 min = 1 h;
   61 min = 2 h; 90 min = 2 h.
4. **Teto diário:** o valor é limitado a `teto_diario_centavos` por bloco de
   24 horas **iniciado** (contado a partir do início da permanência):
   24 h iniciadas = 1 bloco; 24 h + 1 min = 2 blocos.

## RESTRIÇÕES

- Saída SEMPRE `int` (centavos). Sem `float` no caminho do valor.
- Biblioteca padrão do Python apenas; sem rede, sem conta, sem API externa.
- Função pura: mesma entrada, mesma saída (determinística).

## ACEITE

- `calcular_tarifa(15, 500, 5000) == 0` (cortesia inclui o minuto 15)
- `calcular_tarifa(16, 500, 5000) == 500` (1 hora iniciada)
- `calcular_tarifa(61, 500, 5000) == 1000` (2 horas iniciadas)
- `calcular_tarifa(1440, 500, 5000) == 5000` (24 h exatas: teto de 1 bloco)
- `calcular_tarifa(1441, 500, 5000) == 10000` (24 h + 1 min: 25 h iniciadas =
  12500, mas 2 blocos de teto dominam: `2 × 5000`)
- `calcular_tarifa(1800, 500, 5000) == 10000` (30 h: 30 horas iniciadas =
  15000, mas 2 blocos de teto dominam: `2 × 5000`)
- `calcular_tarifa(-5, 500, 5000)` lança `ValueError`

## NÃO-META

- Fuso horário / horário de verão (entrada e saída já chegam como duração em
  minutos).
- Períodos com mudança de tarifa no meio da permanência.
- Interface, persistência, cobrança: isto é só a função de cálculo.
