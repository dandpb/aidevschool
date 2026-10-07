# pg-d01 — Rúbrica de avaliação v1 (objetiva; mesma forma das práticas tp-c01/tp-d01)

Veredito por critério: `met` | `partial` | `not_met` — sempre com evidência
(comando/saída/diff citado). Sem nota agregada: a prática é concluída com os
6 critérios `met` ou `partial` justificado. A rúbrica avalia a **execução do
ciclo**, não a elegância do código.

| # | Critério | Pergunta de verificação (perCheck) |
| --- | --- | --- |
| c-reproducao | O cenário exato do report foi reproduzido manualmente **antes** de qualquer pedido/correção, com saída real registrada (comando + exit code) | Existe um registro de `python3 notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"` (ou equivalente do report) com as 3 linhas `REPROVADO` anteriores ao fix? |
| c-verde-latente | Foi confirmado que a suíte existente (5 testes) passa **com o bug presente** | O registro mostra `5 testes passaram` antes de qualquer edição? |
| c-pedido | O pedido de diagnóstico ao assistente contém: contexto+regra (REGRA.md), reprodução real, caso mínimo, esperado-vs-observado, e pedido de correção mínima na causa raiz com chamadores checados | O texto do pedido cita a regra (`>= 6.0`), a saída real e a fronteira exata (6.0)? Pede explícito para não fazer patch de sintoma? |
| c-vermelho | Existe teste de regressão novo que **falha contra a fixture original** pelo motivo certo (fronteira 6.0), cobrindo unidade e ponto do sintoma | Rodando o teste novo contra `insumos/fixture/notas.py` (sem fix), ele falha com mensagem citando a dissonância APROVADO/REPROVADO em 6.0? |
| c-fix-minimal | A correção é mínima, na causa raiz (`situacao`), e o contrato dos chamadores foi checado antes de editar | O diff toca apenas a comparação (`>` → `>=`)? Há registro dos chamadores de `situacao`/`media` (grep) antes da edição? |
| c-suicao-revisao | Suíte inteira + regressão verdes depois do fix; reprodução do report agora correta; revisão do diff constata que só o necessário mudou | Registro mostra 5+2 testes verdes, as 3 linhas `APROVADO` no cenário do report, e o diff de 1 caractere (mais o teste novo)? |

## Notas de aplicação

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a prática **inconclusa** (não "reprovada" — ver enunciado
  §Retry).
- A rúrica não mede tempo nem estilo de código; duração é guia de cadência.
- Evidência textual basta; esta prática não exige captura de imagem.
- v1 — revisões futuras da rúbrica versionam este arquivo (v2, v3) sem
  editar a v1, mesmo padrão de `curriculum/praticas-transferencia/`.
