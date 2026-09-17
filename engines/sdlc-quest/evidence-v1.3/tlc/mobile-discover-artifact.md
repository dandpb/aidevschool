# .design/retry-webhook.md

ADAPTAÇÃO DIDÁTICA — exemplo fictício, não resultado de agente real.
Fonte: https://agent-skills.techleads.club/skills/tlc-discover/
Consulta: 2026-09-16

## Situation
Retry para administradores aprovado no cenário.

## Problem
O suporte depende de reenvio manual de entregas falhas.

## Verdict
Construir a menor capacidade que reduza a intervenção manual.

## What counts as worked
Meta fictícia acordada: reduzir 40 para menos de 15 min/dia em duas semanas; Ana revisa. Não é um critério de teste unitário.

## Boundary
Sem reenvio em massa ou novos destinos.

## Shape
Adds: solicitação de retry e consulta de tentativa.
Changes: autorização do novo caminho e mensagens de resultado.
Leaves: restante do serviço e contratos não relacionados.

## Decisions
Somente admin do próprio tenant. Nenhuma promessa de exactly-once arbitrário.

## Roadmap
Esclarecer tratamento de duplicatas; então passar a tlc-plan.
