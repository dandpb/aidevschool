# Evidência R9 documental

Produtor: sessão Codex Cloud delegada pelo Dani, 2026-10-04, checks até
14:38:16 UTC. HEAD `b9f77774643b94bfd9fafbd756a1b17482c33e45`. Parecer
independente pertence a `review.md`.

## Execução própria

```sh
PYTHONDONTWRITEBYTECODE=1 python3 engines/aiDevschoolMvp/aidevschool/install.py --check
PYTHONDONTWRITEBYTECODE=1 python3 scripts/skill_vendored_guard.py
git diff --check
```

Todos retornaram **0**. Saídas reais dos dois comandos:

```text
[aidevschool] curriculum.json: 24 concepts, DAG acyclic, order valid ... OK
[aidevschool] keys/rubrics manifest verified: bdba190a07f1902d... OK
[aidevschool] --check: validation passed (no changes)

vendored skill guard: OK (integrity + provenance pins + Track A fixture regression)
```

Sem instalação/agendamento, atualização de pins, self-test ou testes persistentes
novos. Nenhuma suite inalterada de R5/R7 foi repetida. Logs, inventários e checks
ad hoc estão em `/tmp/aidevschool-r9-evidence/`.

## Classificação verificada por AST sem importar runtimes

Script Python por stdin usou ast.parse e o mesmo recorte explicitado pelo teste
existente: remove docstrings, seleciona funções/classes top-level e ast.Assign
para nomes uppercase, compara ast.dump por nome. Não executou o runtime ou a
suite. A diferença de bytes é uma comparação separada de read_bytes.

| Par gate / bundle | Definições comparadas | AST | Bytes |
| --- | --- | --- | --- |
| `core.py` / `_core.py` | 39 | Igual | Diferente |
| `engine.py` / `_engine.py` | 11 | Igual | Diferente |
| `state.py` / `_state.py` | 10 | Igual | Diferente |
| `state_transitions.py` / `_state_transitions.py` | 11 | Igual | Diferente |

Esse check sustenta a classificação da página, não equivalência total do runtime
instalado nem correção de todos os comportamentos. Imports são deliberadamente
excluídos desse contrato de comparação.

## Links e preservação

- Script pathlib/regex resolveu **23 links** de página/intent/spec/plan e
  conferiu whitespace dos quatro novos Markdown: exit 0.
- Remover a única linha `[Portable copies](17_portable_copies.md)` deixa o
  README idêntico ao baseline pré-R9; entradas R5/R7 preservadas.
- Rehash de 6.381 conteúdos anteriores (incluindo artefatos R5/R7 e preparação
  R2a) apontou apenas README como modificado: **6.380 conteúdos iguais**.
  Nenhuma fonte, teste, script, skill, pin, lock, hook ou estado foi alterado.
- Nenhuma tentativa de transferência R2a, aplicação de patches ou reconstrução.

## Hashes da entrega

| Artefato | SHA-256 |
| --- | --- |
| Página R9 | `eba2c730882dfc283b01acc73b4d5f41a1a7c2a4d1eb582c1ab497bbaac0261d` |
| README após R9 | `7bf304968dc6fa807f8517a35d0f6b14c894eaa8f6ffa2bd4dbea77b513abc72` |
| `intent.md` | `bafc30bb540d1084925757cc2d73676563b8d2ae1ca11c90ee35c329bec2b063` |
| `spec.md` | `2ae1621e34b812d56fe47ee6fd08c28f2201453b9cdfd39948d65c6e291fb54b` |
| `plan.md` | `569012ae5fd46fb6b9d830dd7bd592244d0fcdc0d67c827296ab7236314f8cdf` |

Estado desta fatia: implementada localmente; revisão registrada separadamente.
Nenhum commit, push, PR, merge ou deploy. R2a permanece autorizada no recorte
específico e bloqueada pela transferência técnica registrada em seu transport.md.

Correção após revisão: o revisor identificou que o instalador consulta
disponibilidade via CLI, mas não escreve allowlist; removi essa alegação da
página. A fonte corrente prevalece sobre seu docstring antigo. Links da página
e hash foram reconferidos após a única mudança de prosa, sem repetir comandos
de validação/runtime cujo comportamento permanece inalterado.

## Próxima proposta delimitada, não implementada

R3 pode começar por uma análise/spec somente leitura de
`engines/aiDevschoolMvp/aidevschool/scripts/replay.py` e os efeitos relacionados
em `plan_recompute.py`, usando os testes existentes de replay como contrato.
Grounding: `replay(ledger, curriculum, skill_dir)` chama `_rubric_task` para ler
JSON do disco; o CLI lê ledger/state e escreve `replay.scratch.json`. Portanto
“offline” hoje não significa fold sem IO. Delimitar entradas explícitas para
rubric task e separar o contrato do fold dos efeitos do CLI, preservando papéis
teach-back, fases/reviews, campos comparados e exit codes. Esta proposta ainda
precisa de spec/plano e revisão antes de qualquer refatoração; nenhum código
ou teste R3 foi alterado ou executado nesta inspeção.
