# Review independente: proposta documental R3

Data: 2026-10-04. Revisor: contexto separado
`/root/review_offline_replay_plan`, distinto do produtor. Base de fontes:
`b9f77774643b94bfd9fafbd756a1b17482c33e45`, com entregas locais R5/R7/R9.

Conclusão: desenho coerente após correções documentais; não restam findings
substantivos sem tratamento nesta revisão. Isso não aceita implementação nem
ativa o default proposto. Decisões do responsável e provas executáveis continuam
pendentes. Não atribuir nota nem aprovação de código a este resultado.

## Escopo e evidência

Aplicados os passes de `REVIEW.md` e a etapa de review da skill local
`.claude/skills/ai-native-sdlc/SKILL.md`. Lidos root AGENTS/CLAUDE,
learner/AGENTS, substrate/AGENTS e engines/AGENTS, os três documentos R3 e
fontes relevantes de substrate, MVP, installer e testes existentes.

Inspeção exclusivamente estática por leitura/busca. Não executei runtime,
CLI, testes, provider, API de dados/env, sync, publicação, Library ou commit.
Única escrita deste revisor: este `review.md`. O baseline de 6387 hashes em
`/tmp/aidevschool-r3-before.json` e sua conferência integral são evidência da
sessão produtora, não execução independente deste revisor. R2a/transporte
continua bloqueado; não foi reconstruído e sua exceção não autoriza R3.

Versões documentais relidas, SHA-256:

- intent: `c3142ca461dae002b60ae4ebb7f85f37a590ce3eb75e6e8a23ccfcff616518e1`
- spec: `88a7cfdd3ad4c58b941be8e16ee746902bcdcdd7c1b28a2ef4a9ddb160b48e81`
- plan: `af8ab170ee6e89b7a4bece9373527d422a22413dd450add98ba535cd4018f796`

## Findings devolvidos ao produtor e resolvidos

1. **Important — prova CLI incompatível com exit 3.**
   `learner/substrate/tests/test_substrate_cli.py:114` aceita somente 0/1 no
   cenário válido; exigir suite legada verde sem alterar testes era incompatível
   com o exit proposto. Os documentos agora conservam exit 1 e distinguem
   `REPLAY_UNAVAILABLE`, drift e canonical inválido pelo diagnóstico. Falha de
   replay continua explícita; nenhuma fixture deve esconder o novo contrato.

2. **Important — cobertura incompleta do registry.**
   `projections.py:189` agrega sete famílias, incluindo dojoToday. Spec agora
   enumera as sete e propaga replay até `derive_today_snapshot`/`build_snapshot`.
   A expressão anterior “seis famílias” foi corrigida.

3. **Important — coleta de rubricas poderia alterar precedência do ledger.**
   `replay.py:52` atualiza roles somente ao encontrar attempts anteriores,
   globalmente por attempt_id; `replay.py:75` faz curto-circuito antes da leitura.
   Pré-indexar todas as roles mudaria veredict anteriores. Spec agora exige
   pré-pass ordenado, conceitos conhecidos e tabela sem reset novo; negativos
   cobrem verdict anterior, ID reutilizado e role em conceito desconhecido.

4. **Important — seleção, conflito e erro de cache ambíguos.**
   A produção atual escreve filename único (`judgments.py:230`). Spec agora
   seleciona somente `<sweep>-<digest16>.ndjson`, sem inventar históricos; define
   multi-candidate apenas no núcleo em memória, normalização por tipo/valor,
   escolha determinística entre equivalentes e digest misturado como invalid.
   Recibo de digest alheio é irrelevante; fallback-only é miss. Validação estrita
   não altera `replay_cached`, cujo miss online é exigido pelo teste existente.

5. **Important — prova e erros precisavam fronteiras precisas.**
   IO de fontes/projeções agora tem erro sanitizado distinto de cache miss;
   projeção ausente permanece drift. Validação pré-cache cobre CLI/check(None),
   preservando a precondição legada de check(state). A prova futura discrimina
   núcleo sem IO de CLI com leituras, enumera operações de filesystem/env/rede,
   cobre cold-start, falhas injetadas e escritas intermediárias. Suite legada
   deve rodar em cópia isolada; retirar apenas o smoke não impediria sync/env.
   `acceptance/conftest.py:29` chama python3 literal: plano agora fixa PATH e
   exige sanitização/bloqueio também nos subprocessos.

6. **Important — prova MVP proibiria efeito atômico preservado.**
   `_core.py:198` grava `.json.tmp` antes de `os.replace`. Spec/plano agora
   permitem somente scratch final, seu temporário específico e rename, além de
   exigir observação das escritas; hashes finais isoladamente seriam insuficientes.

## Avaliação das fronteiras e compatibilidade

O diagnóstico original está correto: `check()` constrói cliente via dotenv/env;
`replay_cached` chama provider no miss e `ask_and_record` escreve inclusive no
hit. `judgment_client=None` usa parser determinístico, sem garantir equivalência
semântica. A nova fronteira de resolução em memória e store somente de leitura
evita esses efeitos, mantendo wrappers online, textos/digests, aplicação e
relógio fixado. Respostas estritamente válidas precisam provar paridade por
cliente fake; essa paridade ainda não foi executada.

R3B delimita fold, leitura de rubricas e CLI sem duplicar avaliadores ou gates.
`install.py:74` copia o bundle completo; `_install_validation.py:86` calcula
manifest apenas de keys/rubrics. O módulo novo pode acompanhar scripts sem
editar instalador, quatro espelhos ou pins; import em bundle copiado permanece
prova futura. Rollback por hunks/snapshot de cada fatia preserva R5/R7/R9 e
dados; rollback R3A restaura o check antigo com possíveis efeitos online.

## Decisões humanas e provas remanescentes

- Aceitar a mudança de default para recibos estritos e seus dados inválidos,
  inclusive ambientes antes sem chave. Hoje os únicos filenames de recibos são
  `metric-lint-*`; não há profile/pitfalls. O store proposto não consegue replay
  do perfil neste checkout. Ativação depende de decisão e obtenção de recibos
  separadamente autorizada, sem sync implícito nem recibos fabricados.
- Autorizar R3A e/ou R3B e a criação de novas regressões. A superfície atual
  deve falhar por efeito observado no red comportamental, não apenas por
  ImportError de uma API inexistente. Negativa de proteção exige parada.
- Após autorização, executar comandos através do runner isolado descrito no
  plano, registrar comando efetivo/imports/outputs e obter revisão independente
  do diff. Pureza, paridade, contratos online e ausência de escrita/rede ainda
  são critérios propostos, sem resultado executável nesta etapa.

Não existe autorização desta revisão para código, testes, estado canônico,
outputs gerados ou publicação. O responsável decide o próximo gate.
