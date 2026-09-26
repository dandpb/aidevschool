# Spec — AID-2731-atomic-intake

Status: approved
Contrato funcional de `EventQueue.submit` (única superfície alterada):

1. **Criação atômica create-if-absent:** o arquivo da fila `queue/<id>.json` só passa a
   existir com payload completo e imutável na primeira escrita vencedora (tmp por escritor
   + `os.link` atômico — semântica O_EXCL; ver intent.md §Decisão de design).
2. **Idempotência por ID (inalterada):** reenvio com payload idêntico (ignorado o campo
   volátil `created_at`) retorna o evento existente, sem duplicar execução.
3. **Divergência → erro canônico:** payload divergente sobre id existente — concorrente OU
   sequencial — levanta `FactoryError("event id <id> already exists with different payload")`.
4. **Sem exceções fora do contrato:** submit concorrente sobre o mesmo id novo nunca produz
   `FileNotFoundError`, `JSONDecodeError` de leitura parcial, nem aceite duplo silencioso;
   cada escritor usa tmp próprio (`<id>.<pid>.<uuid8>.tmp`) e o remove em toda saída.
5. **Compatibilidade:** assinatura, retorno e comportamento de `get`/`pending`/`claim`
   inalterados; `pending()` (glob `*.json`) não enxerga tmps `.tmp`.
