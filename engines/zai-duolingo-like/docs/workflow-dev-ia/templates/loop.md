# Loop — [nome]

> Especificação de um ciclo autônomo. Um loop sem condição de parada e sem
> verificação independente é só um jeito caro de girar em círculos.

## Gatilho

_Quando roda: manual (`/loop ...`), horário (cron), ou evento (fim de PR)._

## Meta

_Estado final mensurável. Ex.: "cobertura de X ≥ 80%" ou "0 erros de lint"._

## Ciclo (uma iteração)

1. **Medir** — rodar o comando que mostra a distância até a meta: `[comando]`
2. **Agir** — a menor mudança que reduz a distância
3. **Verificar** — re-medir; a melhoria é real só se o comando mostrar
4. **Registrar** — uma linha de log com antes/depois

## Parada

- Meta atingida, OU
- _N_ iterações sem melhoria mensurável, OU
- limite de _M_ iterações (sempre existe teto)

## Guardrails

- Nunca enfraquecer a verificação para passar (proibido apagar teste/skip).
- Mudanças fora do escopo da meta → anotar e seguir.
- Estado do git sempre recuperável (commits pequenos).
