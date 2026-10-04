# Plano aprovado — biblioteca do bairro · fatia 2 de 3 (autoridade para a prática pg-d05)

> Documento fictício desta fixture, congelado ANTES da delegação (papel
> do "Plan Mode" do curso-simples M6). O aprendiz é o **controlador** da
> fatia 2: recebe a entrega do produtor delegado (`delegacao-r1`,
> `delegacao-r2`) e decide com evidência — a autoridade é este plano e o
> `CONTRATO.md`, nunca a narrativa do produtor. Nada aqui depende de
> outra unidade: a fixture (`insumos/fixture/`) já contém a fatia 1
> aplicada.

## Objetivo da fatia 2

Extrair a validação de `emprestar` para uma função própria
`validar_emprestimo(isbn, categoria, renovacoes)` no mesmo arquivo
`insumos/fixture/biblioteca.py`, **preservando cada cláusula do
`CONTRATO.md` (C1–C5)** — inclusive prioridade e texto exato das
mensagens (C2) e a trilha só-em-sucesso (C3).

Progressão: fatia 1 (concluída e mergeada) introduziu `CATEGORIAS`;
fatia 2 (esta) extrai a validação; fatia 3 (futura) extrai a formatação
do recibo.

## Escopo da fatia 2 (allowlist — política estrita, fail-closed)

O produtor da fatia 2 pode **apenas**:

- editar `insumos/fixture/biblioteca.py`;
- criar `insumos/fixture/teste_validacao.py` (testes NOVOS da fatia).

Qualquer outro caminho tocado = fora de escopo. Em especial
`insumos/fixture/testes.py` é **proibido** (suíte existente é contrato).

```json
{
  "id": "fatia-2",
  "permitidos": ["insumos/fixture/biblioteca.py", "insumos/fixture/teste_validacao.py"],
  "proibidos": ["insumos/fixture/testes.py"],
  "max_arquivos": 2,
  "max_linhas_alteradas": 60
}
```

## Proibições (E2)

1. Editar `insumos/fixture/testes.py` ou qualquer teste existente.
2. Criar/renomear arquivos fora da allowlist acima (inclusive
   "utilitários" novos).
3. Mudar mensagens de erro, prioridade (C2) ou a trilha (C3) — o pedido
   é extração, não "melhoria".
4. Novas dependências, rede, contas ou segredos (fixture é offline,
   Python stdlib).

## Validações da fatia (a ordem importa — valide de dentro para fora)

- **V1 — suíte existente verde:** `PYTHONPATH=insumos/fixture python3
  insumos/fixture/testes.py` → `6 testes passaram`, exit 0, **com
  `testes.py` byte-idêntico ao entregue** (sha256 no `MANIFEST.md`).
- **V2 — teste novo da fatia verde:** `PYTHONPATH=insumos/fixture
  python3 insumos/fixture/teste_validacao.py` → verde, exit 0 (cobre a
  validação extraída, inclusive a prioridade C2 com dois erros no mesmo
  pedido).
- **V3 — aceite congelado (comportamento real):** o comando abaixo com
  saída EXATAMENTE igual à esperada (difere ⇒ regressão C1/C2/C3):

  ```
  PYTHONPATH=insumos/fixture python3 -c "
  import biblioteca
  try:
      biblioteca.emprestar('', 'rabisco')
  except ValueError as e:
      print('erro1:', e)
  try:
      biblioteca.emprestar('978-85', 'geral', 3)
  except ValueError as e:
      print('erro2:', e)
  print(biblioteca.emprestar('978-85', 'reserva', 1))
  print(biblioteca.EMPRESTIMOS)
  "
  ```

```json
{
  "id": "aceite-v3",
  "esperado": [
    "erro1: categoria desconhecida: rabisco",
    "erro2: renovacoes invalidas: 3",
    "EMPRESTIMO 978-85 reserva 14d",
    "[('aberto', '978-85', 'reserva', 14)]"
  ]
}
```

## Critérios de aceite da fatia 2

1. Escopo: diff confinado à allowlist (política acima), checável
   mecanicamente (`insumos/verifica_delegacao.py escopo <patch>`).
2. Evidência: V1, V2 e V3 executadas **pelo controlador** com comando,
   exit code e saída registrados — saída colada pelo produtor não é
   evidência.
3. Comportamento: C1–C5 preservados (V3 congelado acima é a prova).
