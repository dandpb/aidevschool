# Práticas de transferência inéditas — pacote tp-c01 (cotidiano) + tp-d01 (dev)

> **versão: v1** · 2026-09-30 · autor: Curriculum Content Engineer (CCE)
> Fecha a lacuna autoral **R10 / RC-4** da matriz curricular r2 ratificada no
> PR #610 @ `579ce995baa7aa28084127b15a9886103ad68a44` (§12 item 10:
> "Tarefa inédita + rubrica de transferência versionada por público (R10) —
> autoria CCE, verificação QA (RC-4)"). Issue: **AID-3506** (filha de
> AID-3453 "Unificar escola e currículo de IA").
> Nível de evidência-alvo por família: **T3** (matriz §0.1 @579ce995) —
> aplicação a problema novo com evidência verificável por terceiro.

## 1. O que este pacote é (e não é)

É **conteúdo revisável**: duas práticas de transferência inéditas com rubricas
versionadas, exemplos autorais de calibração e guias de correção separados dos
enunciados. Não está ligado a runtime, progresso ou visibilidade; não gera
`mastered`, score ou certificação; **teste com alunos continua pendente**
(entregável futuro, fora do escopo AID-3506).

| Prática | Público | Problema (novo) | Competências (glossário spec.md:7–21 @579ce995) |
|---|---|---|---|
| `tp-c01-cotidiano/` | cotidiano | Verificar criticamente rascunho de IA sobre reembolso com pacote de fontes fornecido, incerteza e privacidade | **P F4** verificação · **S F2** uso seguro |
| `tp-d01-dev/` | dev | Avaliar/corrigir sugestão de implementação (tarifa de estacionamento) em fixture local com spec, testes-vermelho e limites de cobertura | **P D4** teste/debug/review · **S D3** construção |

## 2. Verificação de duplicata (feita antes de produzir)

- Board: onda de filhas de AID-3453 — AID-3456 (matriz r2.1), AID-3457
  (auditoria/schema), AID-3497 (matriz-competencias-32 r3), AID-3505
  (metadados P/S em YAML), AID-3453/3484 (entrada estática/SDLCQuest) —
  **nenhum pacote de prática de transferência**; R10/RC-4 seguiam em aberto
  (matriz §12 item 10).
- Repo @ `1975e2c7` (main) e @ `579ce995` (PR #610): sem diretório/artefato de
  "tarefa inédita" ou prática de transferência; exercícios existentes são
  todos casos ENSINADOS (T1/T2) — ver §5.
- Conclusão: **não há pacote equivalente a incorporar**; este pacote é
  produção nova, sem duplicar inventário/curadoria (AID-3453), os 32
  mapeamentos (AID-3497) ou metadados (AID-3505).

## 3. Estrutura

```
curriculum/praticas-transferencia/
├── README.md                       (este arquivo)
├── tp-c01-cotidiano/
│   ├── enunciado.md                objetivo, cenário, insumos, entrega, 2ª tentativa
│   ├── insumos/                    resposta-ia.md + 3 fontes sintéticas seguras
│   ├── rubrica-v1.md               5 critérios separáveis + insuficiente/suficiente
│   ├── guia-de-correcao/solucao.md GABARITO (fora do pacote do aluno)
│   └── exemplos/                   falha + sucesso (EXEMPLOS AUTORAIS rotulados)
└── tp-d01-dev/
    ├── enunciado.md                idem, com requisitos de execução real
    ├── fixture/                    spec.md (5 campos) + tarifa_sugerida.py + testes_sugeridos.py
    ├── rubrica-v1.md               6 critérios separáveis
    ├── guia-de-correcao/           solucao.md + solucao/ (código executável de referência)
    └── exemplos/                   falha + sucesso (EXEMPLOS AUTORAIS rotulados)
```

Regras transversais: solução/gabarito separados do enunciado; exemplos
rotulados como exemplos do autor, nunca resultados de alunos; cotidiano exige
justificativa verificável (nenhuma alternativa pronta); dev exige execução
real do aluno (código de assistente não é evidência); nenhuma promessa de
certificação ou mastery.

## 4. Pré-requisitos citados (lições reais, objetivos citados @579ce995)

**tp-c01** — `curriculum/ai-literacy/modules/`:
- l02 (`01-ai-sem-misterio/l02-…yaml:7`) — "reconhecer que [a resposta] precisa
  ser verificada antes de ser usada"
- l09 (`03-avaliar-e-verificar/l09-…yaml:7`) — identificar sinais de alucinação
- l10 (`03-avaliar-e-verificar/l10-…yaml:7`) — quando exigir fonte externa
- l12 (`04-seguranca-e-aplicacao/l12-…yaml:7`) — classificar informações como
  seguras/sensíveis antes de colar na IA
- l20 (`06-rotina-com-ia/l20-…yaml:8`) — marcar afirmações que exigem
  verificação e escolher fonte
- l26 (`07-ia-alem-do-texto/l26-…yaml:9`) — conferir saída da IA contra o
  original e corrigir divergências

**tp-d01** — idem:
- l16 (`05-dev-contexto-e-escolha/l16-…yaml:7`) — pedido de código com contexto
  e avaliação com critérios de engenharia
- l21 (`05-dev-contexto-e-escolha/l21-…yaml:7`) — pedir testes que valem a
  pena (framework, comportamento-alvo, borda explícita)
- l22 (`05-dev-contexto-e-escolha/l22-…yaml:7`) — revisar código sugerido com
  critérios objetivos, separando aceita/recusa com motivo
- l27 (`05-dev-contexto-e-escolha/l27-…yaml:7`) — debug: reproduzir
  deterministicamente antes de perguntar
- l28 (`05-dev-contexto-e-escolha/l28-…yaml:7`) — cobertura limitada ao que
  testes provam (suíte verde ≠ comportamento intacto)

Fontes-fortes reutilizadas (não copiadas): `dev-workflow-claude/workflows/02-corrigir-bug`
(disciplina reproduzir → vermelho → correção mínima → revisão), `docs/curso-simples`
(spec em 5 campos CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META e roadmap de
reprodução real), matriz §0.1 (níveis T1/T2/T3) e §11 (limites da cobertura).

## 5. Comparação com os exercícios ENSINADOS (prova de ineditidade do problema)

| Exercício ensinado (onde) | O que ensina | Diferença da prática nova |
|---|---|---|
| l09/l20 (ai-literacy; caso "crescimento do setor 41,3%") | sinais de invenção; quando buscar fonte EXTERNA | tp-c01: fontes JÁ FORNECIDAS; veredito por afirmação COM citação linha a linha; incerteza (fonte silente) e privacidade integradas; nada de múltipla escolha |
| l26 (ai-literacy) | conferir EXTRAÇÃO de anexo campo a campo | tp-c01: não há extração — é resposta assertórica nova a verificar + decisão de canal/privacidade |
| l16/l21/l22 (ai-literacy; webhook zod/redact/retry) | pedido de código; pedir testes; revisar sugestão (rubrica simulada T1) | tp-d01: problema novo (tarifa/tolerância/teto), contrato escrito fornecido, EXECUÇÃO REAL do aluno (T3), regra inventada pela IA a detectar |
| workflow 02 (dev-workflow-claude; bug de regex no CLI `tempo`) | disciplina corrigir-bug com vermelho primeiro | tp-d01: mesma disciplina APLICADA a contrato novo (sem regex, sem CLI), com fronteiras múltiplas (15 min, hora iniciada, bloco de teto, contrato de erro) e declaração de limites exigida |
| curso-simples (release notes CLI) | reprodução e execução real primeiro | tp-d01: execução real no JUlGAMENTO de sugestão de IA + limites de cobertura (não reprodução de artefato pronto) |

Nenhum caso ensinado é apresentado aqui como tarefa inédita; os insumos são
todos novos (reembolso/estacionamento) e sintéticos.

## 6. Comandos realmente executados (verificação first-hand)

Worktree limpa da branch `aid3506/praticas-transferencia` @ base
`1975e2c7967cbd4a8af817271de89bf0f70bd617` (main); Python 3.13.5; sem rede,
sem API, sem conta, sem segredo.

```
$ cd curriculum/praticas-transferencia/tp-d01-dev/fixture
$ python3 -m unittest testes_sugeridos -v
… 4 tests … OK                       # suíte sugerida VERDE com defeitos presentes (verde ilusório)
$ python3 - <<'EOF'                  # check inline dos casos do ACEITE (spec.md) contra a sugestão
from tarifa_sugerida import calcular_tarifa as f
for m, esp in [(15,0),(16,500),(61,1000),(1440,5000),(1441,10000),(1800,10000)]:
    print(m, "min -> obtido", f(m,500,5000), "| esperado", esp)
f(-5,500,5000); print("-5 -> retorno normal (esperado ValueError)")
EOF
# saída real: 15→500(≠0) · 16→500(ok) · 61→500(≠1000) · 1440→12000(≠5000) · 1441→12000(≠10000) · 1800→15000(≠10000) · −5→retorno(≠ValueError)
$ cd ../guia-de-correcao/solucao
$ PYTHONPATH=../../fixture python3 -m unittest testes_vermelhos_contra_sugestao
… Ran 7 tests … FAILED (failures=7)   # VERMELHO contra a sugestão original
$ python3 -m unittest testes_da_correcao
… Ran 14 tests … OK                    # VERDE na correção mínima de referência
```

Controles negativos do pacote (dev): suíte sugerida verde não prova ausência
de defeitos (6 divergências listadas); insumos são read-only por enunciado
(adulterar `tarifa_sugerida.py` invalida a prova — rubrica c3). Controles
negativos (cotidiano): memorando sem citações → c2 insuficiente; colar dado
sensível → c4 insuficiente e reprova mesmo com vereditos certos.

## 7. Limitações declaradas

- Não testado com alunos; calibração inicial por exemplos autorais (rotulados).
- Correção aplicada por revisor humano (ou corretor treinado); sem automação
  de score; sem integração com `learner/` ou engines (isto é conteúdo, não
  runtime) — integração futura é frente CPE, fora daqui.
- tp-c01 parte do pressuposto de 20 min e 7 afirmações; calibração de tempo
  só com uso real.
- tp-d01 assume Python 3 (stdlib); o contrato cala sobre tarifas ≤ 0 e
  mudança de tarifa no meio (limites declarados na solução, não defeitos).
- Screenshots: não há interface; evidências são saídas de comando reais
  registradas neste README e no guia (texto colado, origem/versão citadas).

## 8. Fora de escopo (vigiado nesta entrega)

Sem merge/deploy/publicação; sem recrutamento; sem tocar pilotos AID-641/909,
gate AID-1222, PRs #610–#616 (congelados) ou #617; sem novo engine, schema,
serialização YAML de runtime, seed, compra, alteração de runtime/progresso/
visibilidade/pré-requisitos; sem tarefas auxiliares duplicadas.

## 9. Como revisar (mapeado ao aceite formal da AID-3506)

1. **Content Designer** — novidade (§5), clareza/nível dos enunciados,
   transferência real nos dois públicos; ler `tp-*/enunciado.md` +
   `rubrica-v1.md` + `exemplos/`.
2. **Verifier & Evidence Engineer** — controles negativos (§6 e seções
   "Controles negativos" das rubricas) e suficiência das evidências;
   re-executar os comandos do §6 na branch.
3. Qualquer mudança de critério = bump rubrica v2 + changelog (regra nas
   próprias rubricas).
