---
description: Roda o subagent verifier (adversarial, re-deriva do zero) numa fase/artefato específico. Útil para checar trabalho fora do loop completo.
argument-hint: "[fase: spec|impl|review|benchmark|optimize] [projeto opcional]"
---

Dispare o subagent **`verifier`** (via Task) para verificar `$ARGUMENTS`.

O verificador deve **partir do zero**, sem confiar no produtor, e usar o `verify_prompt` canônico da
fase correspondente em `.mavis/plans/plan.yaml` como checklist. Ele **re-roda** builds/testes/benchmarks
de verdade e tenta refutar o trabalho (mandato de refutação). Nada de evidência fabricada.

Apresente o veredicto estruturado (PASS/FAIL + checks + evidência file:line). Em FAIL, liste o que o
produtor precisa corrigir. **Não** atualize `learner/pipeline_status.md` por conta própria — apenas reporte o veredicto.
