# Especificação — WEBHOOK-042

MODELO DIDÁTICO. Decisões ilustrativas, não implementação validada.

- Administrador só acessa entregas do seu tenant.
- Uma tentativa ativa por entrega sob concorrência.
- Rejeitar entradas e acessos inválidos.
- Identificador estável para deduplicação no destino.
- Não prometer exatamente uma vez a qualquer destino.
- Logs não contêm credenciais ou payload sensível.
- Timeouts geram estado explícito; resposta perdida pode significar processamento concluído.

## Prova planejada
Integração, teste negativo entre tenants, concorrência, timeout e inspeção de logs.

## Decisões pendentes
Contrato HTTP, armazenamento, política de retries e retenção devem ser definidos no projeto real.
