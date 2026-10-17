# Spec: R3B autorizada; R3A aditiva fora desta fatia

## API e fronteiras

- Novo replay_fold.py contém fold_ledger(ledger, curriculum, rubric_tasks),
  required_rubric_ids(ledger, curriculum) e auxiliares puros. Entradas são
  listas/mapping em memória; saída concepts nova; não mutar inputs.
- Um único iterador puro interno classifica eventos conhecidos e roles na
  ordem do ledger. Tanto coleta de IDs necessários quanto fold usam esse
  iterador, evitando classificadores divergentes. Ignorar conceitos desconhecidos
  como hoje, depois de acessar campos básicos type/payload como o código atual.
- Role teach_back é registrada só por attempt_recorded anterior de conceito
  conhecido, globalmente por attempt_id. Registro posterior não muda verdict
  anterior; reutilização do ID não inventa reset. Preservar leitura de evidence
  G4 e curto-circuito: role já conhecida dispensa leitura da rubrica.
- Coleta retorna IDs G4 necessários únicos em ordem de primeira necessidade.
  O wrapper replay(ledger, curriculum, skill_dir) preserva assinatura e lê
  cada tarefa necessária uma vez via _rubric_task, depois chama fold.
- Mapping distingue ID necessário não carregado (MissingRubricTaskError,
  ValueError explícito) de ID carregado com None (rubrica ausente, primary).
  JSON inválido no wrapper continua erro; não fallback/reparo. Rubrica não
  necessária não é lida, mesmo se inexistente ou corrompida.
- Núcleo não recebe Path, provider, callback ou clock, nem importa _runtime,
  os, socket, datetime ou módulos de IO. Import local de typing permitido.
  Classificação/fold/blank state permanecem única lógica de replay; não duplicar
  avaliador nem alterar gate/runtime shared ou quatro espelhos.

## Compatibilidade

Preservar inicialização AVAILABLE/LOCKED, ordem dos eventos, lesson/attempts,
G3 streak/last_pass_ts/asked_item_ids, teach_back_passed sem tocar streak G3,
review_due e review_scheduled e transições de revisão (dobrar target até limite
atual, reset para curriculum target no fail, limpar next_review_ts).
Manter seis FIELDS: status, scaffold_level, attempts, gate_progress,
target_days_effective, next_review_ts. plan_recomputed e session_started não
produzem efeito por conceito. Não validar cadeia/gates ou reparar malformed.

FIELDS, _rubric_task e main da CLI mantêm comportamento; main deve permanecer
byte-identical. stdin JSON, leitura curriculum/ledger/state, stdout JSON,
sucesso 0/divergência 2 e scratch path preservados. Writes permitidos pela CLI:
replay.scratch.json.tmp, rename para replay.scratch.json e mkdir do diretório
pai como atomic_write_json já faz. Nenhum write em state/ledger/rubricas.

Leitura única de rubrica captura a tarefa para todo fold: não garante snapshot
transacional se arquivos mudarem durante a carga. Compatibilidade considera
inputs estáveis. O instalador já copia todo scripts; nenhum ajuste nele/pins.

## Prova e negativos

1. Core executa com IO/env/rede/clock proibidos e chave sentinela presente,
   sem mutação de ledger/curriculum/rubric_tasks; resultados repetíveis.
2. Roles antes/depois, ID reutilizado e roles de conceito desconhecido;
   teach-back G4 via rubrica, teach-back G3 persistido, fail G3 e deduplicação
   de asked IDs; transições/review schedule; desconhecidos e curriculum vazio.
3. ID necessário faltante lança erro; None carregado é primary. Wrapper com
   JSON inválido necessário falha; JSON inválido desnecessário não é lido.
   Leitura única por ID; fold e wrapper equivalentes em fixtures sintéticas.
4. CLI instalada em cópia do bundle funciona sem repo; sucesso/divergência
   mantêm JSON/exit; scratch temporário+rename observados, canon/ledger imutáveis.
5. Acceptance existente full ledger replay zero diffs, G4, review ladder e
   reschedule; paridade dos espelhos existentes, em cópia isolada com rede
   bloqueada e ambiente allowlist, sem suites/execução online.
6. Teste novo escrito antes dos runtimes e congelado; nenhum teste existente
   editado. Red pela API ausente é prova de disponibilidade, não demonstração
   de bug no check legado, que não será corrigido aqui.

R3A aprovada como estratégia aditiva futura: API/entrypoint offline explícitos,
store somente de leitura, miss explícito, legado preservado. Sem implementação
ou ativação nesta etapa; não gerar nem fabricar recibos.
