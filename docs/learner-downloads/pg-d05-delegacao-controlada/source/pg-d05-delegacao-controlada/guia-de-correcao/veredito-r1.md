# pg-d05 — Veredito de referência da r1 (consulte APÓS a tentativa)

Veredito modelo do controlador para `insumos/delegacao-r1/` — o que o
critério c4 espera: cláusula por achado, retrabalho objetivo.

## Veredito: REJEITAR a rodada r1 (retrabalho, não rejeição do produtor)

| # | Achado | Cláusula violada | Evidência |
| --- | --- | --- | --- |
| 1 | `insumos/fixture/testes.py` editado no diff da fatia | E2.1 (suíte existente é contrato) + E1 (fora da allowlist) | `verifica_delegacao.py escopo` → `FALHA proibido: insumos/fixture/testes.py`; sha256 `41c0669d…` ≠ `e1deddbf…` (MANIFEST) |
| 2 | Arquivo novo `insumos/fixture/util_texto.py` criado | E1/E2.2 (fora da allowlist; "utilitário" não pedido) | `escopo` → `FALHA fora da allowlist: insumos/fixture/util_texto.py` |
| 3 | Mensagens de erro reescritas (`categoria invalida`, `isbn obrigatorio`, `renovacoes fora do limite`) | C2 do CONTRATO (texto e prioridade são congelados) + E2.3 | V3 diverge do bloco `aceite-v3` (`erro1: categoria invalida: rabisco` ≠ `categoria desconhecida: rabisco`) |
| 4 | Alegação "suíte 6/6 verde" sem V3 e sem exit codes | Critério de aceite 2 do plano (evidência do controlador); "verde" obtido com teste editado (achado 1) | Suíte re-executada pelo controlador: verde — mas o verde é manufaturado pelo achado 1; V3 ausente da resposta |

## Retrabalho pedido ao produtor (o que a r2 deve entregar)

1. Restaurar `testes.py` byte a byte (suíte existente não se edita).
2. Remover `util_texto.py` (formatação é assunto da fatia 3, não desta).
3. Restaurar o texto exato das três mensagens (C2) na extração.
4. Testes novos da fatia em `insumos/fixture/teste_validacao.py`
   (permitido), incluindo a prioridade C2 com dois erros no mesmo
   pedido.
5. Reentregar com V1 (suíte + sha256), V2 (teste novo) e V3 (aceite
   congelado) — executados e colados por quem entrega, sabendo que o
   controlador vai re-executar tudo.

## Por que não "pedir desculpas e aceitar"

O pedido da fatia era **extração**; a r1 embalou três mudanças de
comportamento/estrutura num diff que "melhora" o código. Aceitar pelo
resumo ("suíte verde, nada fora do escopo") trocaria o contrato pelo
papo do produtor — exatamente o que M7 proíbe e o wf 04 mostra custar
caro (`"NaNm"` com CI 5/5 verde).
