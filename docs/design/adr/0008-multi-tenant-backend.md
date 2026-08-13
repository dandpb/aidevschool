# ADR-0008: Backend multi-tenant — filesystem canônico com modo servidor opcional

**Status:** Proposed · **Data:** 2026-08-13 · **Decisor:** Daniel (proposta gerada
na Fase 4.1 com spike executável; pendente de aceite)
**Contexto:** `docs/VISION.md` mantém duas lacunas pendentes: **#4 — contas e
sincronização entre dispositivos** e **#6 — estado canônico multi-learner**, e a
decisão pendente **“Replicação multi-learner do filesystem”**. Hoje o canônico é
um único arquivo, `learner/learning_state.yaml` (aprendiz hardcoded
`daniel-barreto`), e `python3 -m learner.new_instance` apenas *troca* o aprendiz
da instância local — não existe serviço, conta, nem sync. Qualquer solução
precisa preservar três regras invioláveis do ecossistema: **a certeza de
conclusão nunca vive no modelo**, **produtor ≠ verificador**, e o **gate
empírico** (tentativa + evidência adequada + verificação independente antes de
`mastered`). Um quarto facto estrutural pesa na decisão: a evidência de gate já
é, e continuará sendo, **arquivos** — `learner/attempts/`,
`learner/verifier_receipts/`, artefatos de `curriculum/` — referenciados pelo
estado canônico via caminho + digest (`evidence_digest`).

## Opções

|| Opção | Prós | Contras |
|| --- | --- | --- |
|| A. Filesystem continua canônico + camada de API/serviço (FastAPI) por cima, lendo/escrevendo instâncias por usuário | reutiliza `learner.substrate` e `learner.gate` sem mudança; evidência já é arquivo; migração ≈ zero; um arquivo por aprendiz vira shard natural | sync exige operar um serviço; consultas ricas (rankings, buscas) são ruins em YAML; lock/concorrência por aprendiz precisa ser construído |
|| B. Migrar canônico para DB (Postgres); filesystem vira cache/export | sync e multi-tenant nativos; consultas ricas; transações | reimplementar `validate()`, `commit_gate_transition`, recibos e digests contra outro store — risco real de enfraquecer sutilmente as invariantes; evidência continua em arquivo/objeto (o DB nunca substitui o filesystem); maior custo de migração e de operação; quebra o fluxo local auditável “edita YAML → `sync()`” |
|| **C. Híbrido: single-player local continua + modo servidor opcional multi-usuário (escolhida)** | fluxo local de hoje fica intacto para sempre (custo de migração zero para o piloto); o modo servidor é a opção A montada sobre o **mesmo** substrato e o **mesmo** gate; sync só onde o servidor roda; alinha com o local-first do ADR-0005 (item 5) e adia contas até haver hipótese validada | dois modos de operação para documentar; sync entre dispositivos só existe no modo servidor; o serviço ainda precisa de auth, locks e deploy — fora desta fatia |

## Decisão

**Adotamos a opção C — híbrido — com o modo servidor implementado como a opção
A (serviço fino sobre o filesystem canônico).**

1. **O canônico continua sendo o filesystem.** `learning_state.yaml` (schema v2),
   `attempts/`, `verifier_receipts/` e a evidência de `curriculum/` seguem como
   fonte de verdade auditável. Nenhuma regra de invariante muda.
2. **O modo single-learner local permanece o padrão.** CLIs
   (`python3 -m learner.substrate`, `learner.new_instance`, `learner.gate`) e as
   views derivadas funcionam exatamente como hoje; nada nesta decisão exige
   servidor para um aprendiz sozinho.
3. **O modo servidor é um adapter, não um novo substrate.** Um serviço HTTP
   (FastAPI) resolve `learner_id → instância` e delega **toda** leitura e
   escrita ao código existente (`load_canonical`, `validate`,
   `commit_gate_transition`). Instâncias vivem em
   `learner/instances/<learner_id>/learning_state.yaml`; a instância-piloto
   (`learner/learning_state.yaml`) continua válida e equivale à instância cujo
   `learner.id` ela declara.
4. **A régua não se move.** O serviço **nunca** promove unidade: `mastered`
   continua exigindo tentativa + evidência + recibo de verificador independente
   (`evidence_verifier_source` + `evidence_digest`), persistido somente via
   `verify_and_gate` / `commit_gate_transition`. Produtor e verificador
   continuam em contextos separados — o servidor é transporte e custódia, não
   juiz. Ratings FSRS continuam derivando exclusivamente de outcomes de gate.
5. **Sync entre dispositivos = servidor como detentor do canônico.** Clientes
   recebem *read models* derivados (mesmo padrão compilador→read-model do
   ADR-0005). Progresso local de navegador (IndexedDB) segue **não-canônico** e
   incapaz de representar `mastered`, como já estabelecido.
6. **Autenticação/autorização ficam para a fase seguinte.** O desenho esperado:
   identidade autenticada mapeia para `learner_id`; o serviço só serve a
   instância daquele id. O spike desta fase é deliberadamente sem auth.

Como os critérios fecham:

|| Critério | Resultado com C |
|| --- | --- |
|| Certeza de conclusão nunca no modelo / produtor ≠ verificador | intacto — a única porta de escrita de mastery continua sendo o gate com recibo independente; o serviço não ganha autoridade de julgamento |
|| Gate empírico preservado | intacto — evidência e recibos continuam arquivos verificados com digest re-checado pelo `validate()` |
|| Custo de migração | zero para o fluxo local; o modo servidor só adiciona um diretório de instâncias e um adapter |
|| Sync entre dispositivos | resolvido no modo servidor (canônico hospedado + read models); ausente no modo local, o que é declarado e aceitável para o piloto |

## Spike desta fase (evidência de viabilidade)

`learner/service/` contém um spike **read-only** marcado como spike:
`GET /learners/{learner_id}/state` resolve a instância (diretório de
instâncias ou a instância-piloto pelo `learner.id`) e devolve o estado canônico
carregado por `learner.substrate.load_canonical` — sem auth, sem escrita, sem
lock. Os testes (`learner/service/tests/`) sobem o app com `TestClient` e
cobrem: estado do aprendiz real do repo, 404 para id desconhecido, preferência
por `instances/<id>/` e rejeição de ids fora do padrão seguro. O spike prova
que a opção A/C funciona sobre o código existente **sem tocar no substrato**.

## Limites explícitos

- Isto é **ADR + spike**, não o backend completo: ficam fora auth, escrita via
  HTTP, locks por aprendiz, deploy, migração de instâncias reais e sync de
  read models para clientes.
- Nenhuma rota futura de escrita pode contornar `commit_gate_transition`;
  endpoints de gate, quando existirem, recebem *decisão já verificada*, nunca
  “opinião” do cliente.
- A promoção canônica de AI Literacy (decisão pendente #2 do VISION) é ortogonal
  e continua pendente; este ADR não a autoriza.
- Se um dia houver necessidade comprovada de consultas ricas sobre dezenas de
  milhares de aprendizes, reabrir a discussão da opção B — como *projeção* em
  DB derivada do filesystem canônico, nunca como fonte de verdade primária.

## Consequências

- Fica mais fácil: ligar um modo servidor sem reescrever substrate nem gate;
  testar multi-learner com instâncias em disco; manter a auditoria
  “arquivo + recibo + digest” que sustenta a confiança do ecossistema.
- Fica mais caro: operar e documentar dois modos (local e servidor); construir
  auth e concorrência por aprendiz na fase seguinte; resistir à tentação de
  tratar o serviço como atalho para mastery.
- Revisitar quando: o primeiro piloto multi-usuário real medir ativação e
  retenção — aí decidir auth definitiva, locks, e se read models derivados
  bastam ou se uma projeção em DB se justifica.
