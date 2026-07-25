# ADR-0006: Contrato de invocação do verificador G4 (skill `aiDevschoolMvp`)

**Status:** Proposed · **Data:** 2026-07-25 · **Decisor:** Daniel (pendente ratificação)
**Contexto:** a spec final `docs/plans/ai_devschool_mvp_spec.agent.final.md`
define o gate G4 (rubric-anchored LLM scoring) e exige, em §12.1 ("Four gates")
e §12.3 ("all four gate types exercised"), que os exemplos trabalhados de §6.4 —
incluindo o **Example 4 (G4 fail, C13 teach-back)** e a **âncora de aprovação
`c13_teach_back`** — sejam reproduzidos *byte-a-byte*. A spec, porém, não é
executável como escrita para o caminho LLM: há uma contradição entre três cláusulas
normativas. Este ADR propõe o contrato que resolve a contradição sem alterar a
schema fechada de `config.json` nem violar o isolamento de tokens.

## A contradição (normativa)

| Cláusula | Exigência |
| --- | --- |
| §4.1 + §4.3 | "`gate_check.py` invoca o verificador na temperatura 0"; `config.json` nomeia o endpoint do verificador |
| §8.2 (`SkillConfig`) | schema **fechada** (`additionalProperties: false`): só `tutor_model`, `verifier_model` (nomes), `channel`, `install_platform`, `skill_version`, `feature_flags` — **sem campo de endpoint/URL/credencial** |
| §9.2 | "scripts MUST NOT read, echo, or log tokens"; tokens vivem só na configuração da plataforma, nunca na skill folder |

Um script CLI standalone não pode realizar uma chamada de modelo reproduzível sem
 deter endpoint + credencial — o que §9.2 proíbe e §8.2 não fornece. Substituir G4
 pelo fallback G3 (`feature_flags.llm_gates_enabled=false`, §6.3.4) **não satisfaz**
 §12.1/§12.3, que exigem o veredito G4 real reproduzido byte-a-byte.

## Opções

| # | Decisão | Alternativas | Escolhida |
| --- | --- | --- | --- |
| 1 | Como G4 chama o modelo em operação live | (a) script lê token da plataforma; (b) script chama CLI da plataforma que detém o token; (c) skill não chama LLM, só fallback G3 | **(b) bridge via CLI/facilidade da plataforma, sem token na skill** |
| 2 | Como G4 é aceito byte-a-byte sem LLM live nos testes | (a) chamar LLM real em CI (não-reproduzível); (b) substituir por G3 fallback (não-conforme §12.1); (c) adapter record/replay que carrega o veredito gravado do modelo e exercita o caminho real de G4 | **(c) adapter record/replay** |
| 3 | Onde vive o contrato | (a) emendar a spec final; (b) schema de config nova; (c) ADR que preenche o subespecificado sem tocar na schema fechada | **(c) ADR, schema intocada** |

## Decisão

### 1. `gate_check.py` resolve G4 por um **verifier-adapter**, não diretamente

G4 é implementado como: *misconception screen determinística → avaliação por item
via adapter → montagem do veredito + embed no ledger*. O adapter é selecionado por
variável de ambiente `AIDEVSCHOOL_G4_ADAPTER` (`recorded` | `platform`), padrão
`platform` em operação e `recordeado` em aceitação. A lógica de G4 (screen, rubric
dispatch, montagem do `VerdictRecord`, regra de aprovação "every required item
true") é **idêntica** independentemente do adapter — só a fonte do julgamento por
item muda. Isto preserva §6.1 (artefato idêntico + versão idêntica → veredito
idêntico).

### 2. Adapter `recorded` (aceitação + replay offline, determinístico)

Carrega julgamentos por item gravados, indexados por
`(rubric_id, rubric_version, artifact_sha256)`, de arquivos versionados em
`keys/g4_recordings/{rubric_id}.json`. O Example 4 §6.4 **já fornece** os
julgamentos gravados (tb1 pass, tb2 fail + feedback, tb3 pass, tb4 pass) e a
âncora de aprovação; o adapter os devolve para o artefato correspondente, e o
resto do caminho G4 produz o veredito byte-a-byte. Isto é fiel ao próprio modelo
de replay da spec: §6.1 exige para G4 "the recorded model" e §7.2 audit step 3
diz "the recorded model at temperature 0" — o veredito gravado do modelo **é** o
veredito reproduzível. Exercita o caminho real de G4 (não o fallback G3), satisfaz
§12.1/§12.3, e é offline e determinístico.

### 3. Adapter `platform` (operação live, sem token na skill)

Despacha para uma facilidade de chamada de modelo da plataforma resolvida por
ambiente — p.ex. `OPENCLAW_MODEL_CLI` apontando para o binário `openclaw`, ou o
equivalente do Hermes Agent — passando `verifier_model` de `config.json` como nome
do modelo, na temperatura 0, com o prompt da rubric + âncoras. O adapter **não**
lê, ecoa ou loga tokens (§9.2): a autenticação fica na configuração da plataforma
que o CLI carrega internamente. Se o CLI não estiver configurado, G4 aborta com
exit 1 e uma sentença clara — nunca improvisa veredito (§9.3).

### 4. `config.json` intocada; nenhum endpoint na skill

A schema fechada §8.2 não muda: `verifier_model` continua um *nome*; o endpoint e
a credencial são resolvidos pela plataforma, não pela skill. O kill-switch
`feature_flags.llm_gates_enabled=false` (§6.3.4) permanece disponível e serve G4
pelos bancos G3 shipados — mas isto é **operação degradada**, não aceitação.

## Por que é conforme

- **§6.1 (reprodutibilidade G4):** mesmo artefato + mesma rubric version + mesmo
  modelo gravado + temp 0 → veredito idêntico. Record/replay do modelo gravado é
  exatamente isto.
- **§7.2 audit step 3:** "the recorded model at temperature 0" — o replay carrega
  o comportamento gravado, não reinvoca o modelo.
- **§9.2 (tokens):** o adapter `platform` usa CLI da plataforma; nenhum token na
  skill folder; nada é lido/ecoado/logado.
- **§12.1/§12.3:** os quatro gates, incluindo G4, são exercidos e reproduzidos
  byte-a-byte pelo caminho real (não fallback).

## Consequências

- **Shipado junto à skill:** `keys/g4_recordings/` com os vereditos gravados das
  âncoras de §6.4 (pass + fail por rubric G4). Estes são *fixtures de teste*,
  versionados como rubrics, e devem acompanhar qualquer mudança de rubric
  (§12.2 gate-change discipline: bump semver + novos fixtures).
- **Operação live** exige o CLI/facilidade da plataforma documentado; sem ele, G4
  não emite veredito LLM (e o kill-switch permanece como opção degradação).
- **Custo de reversão:** baixo. O adapter é um seam; trocar a fonte de
  julgamento (outro CLI, outro provider, ou um servidor local vLLM) é trocar o
  adapter `platform`, sem tocar na lógica de G4 nem na schema de config.

## Pendência

Este ADR está **Proposed** até Daniel ratificar: (1) o seam do adapter
record/replay como mecanismo de aceitação G4, e (2) o bridge via CLI da
plataforma (com o binário/flag concreto do OpenClaw ou Hermes a documentar). Sem
ratificação, o núcleo executável de `aiDevschoolMvp` pode ser construído e
verificado para G1/G2/G3 + máquina de estados + ledger + scheduler + plano +
card + replay + install, mas a aceitação G4 fica bloqueada.
