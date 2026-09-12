# AID-83 — Validação independente do smoke read-only do OpenClaw

**Disposição:** APROVADO no escopo testado  
**Severidade residual:** baixa  
**Data:** 2026-08-23 (UTC)  
**Ambiente:** Linux, Python 3.13.5, pytest 8.4.2, checkout compartilhado com alterações preexistentes

## Charter baseado em risco

Risco principal: `--preview` anunciar comportamento read-only, mas alterar o estado canônico do
aprendiz ou do pipeline. Riscos secundários: recibo sem indicar a fonte efetiva, código de saída
incompatível com o resultado e regressões no engine OpenClaw.

Critério de aprovação: execução real do CLI com recibo coerente e igualdade de conteúdo e mtime,
antes/depois, de `learner/learning_state.yaml`, `learner/pipeline_status.yaml` e
`learner/pipeline_status.md`; testes específicos e suíte do engine verdes.

## Evidência reproduzível

### Smoke real read-only

Comando executado na raiz do repositório (o script capturou SHA-256 e `stat -c '%n %s %Y'`
antes/depois e comparou ambos com `diff -u`):

```bash
paths=(learner/learning_state.yaml learner/pipeline_status.yaml learner/pipeline_status.md)
sha256sum "${paths[@]}" > /tmp/aid83-before.sha256
stat -c "%n %s %Y" "${paths[@]}" > /tmp/aid83-before.stat
python3 -m engines.openclaw --preview
sha256sum "${paths[@]}" > /tmp/aid83-after.sha256
stat -c "%n %s %Y" "${paths[@]}" > /tmp/aid83-after.stat
diff -u /tmp/aid83-before.sha256 /tmp/aid83-after.sha256
diff -u /tmp/aid83-before.stat /tmp/aid83-after.stat
```

Resultado: código de saída **0**; ambos os `diff` vazios.

```text
OpenClaw checklist preview (read-only)
  source: learner/pipeline_status.yaml
  project: curriculum/02_key_value_store
  phase: cycle-complete
  result: PASS — cycle complete
  next phase: -
```

Hashes antes/depois (idênticos):

```text
c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf  learner/learning_state.yaml
668ac80145de042c0bd78dd4210ceccf1dc0ad932770eb4a03f2fd6d886f169a  learner/pipeline_status.yaml
a8fcbcb603f68ddd03ac7f3e6742c5580dae6194b11bd112206a7d7033188b54  learner/pipeline_status.md
```

### Testes automatizados

```text
$ python3 -m pytest engines/openclaw/tests/test_cli_preview.py -q
2 passed in 0.04s

$ python3 -m pytest engines/openclaw/tests/ -q
18 passed in 0.11s
```

Os testes específicos cobrem preservação byte a byte dos três arquivos canônicos, fonte YAML no
recibo e o ramo HALT com código de saída 1/fonte Markdown simulada.

## Triagem e prontidão

Nenhum bug de produto nem falha de infraestrutura foi reproduzido. O smoke read-only está
**pronto para uso no escopo verificado**: a execução real não alterou conteúdo, tamanho ou mtime do
estado canônico, e a suíte do engine permaneceu verde.

Limitações explícitas:

- O estado real observado já estava em `cycle-complete`; portanto o smoke real não percorreu uma
  fase intermediária nem um gate bloqueado. Esses ramos têm cobertura automatizada, mas o HALT usa
  monkeypatch no teste específico.
- Não foram executadas suítes de outros engines nem os `make` targets compartilhados, pois não são
  necessários para provar este contrato CLI isolado.
- O checkout compartilhado estava sujo antes da validação. Nenhuma alteração canônica do aprendiz
  foi feita por esta QA; a única adição é este relatório.

## Verificação de workflow e rastreabilidade de publicação (hito de handoff)

Workflow YAML validado e job `openclaw` inspecionado para o código atual:

```text
python3 - <<'PY'
import yaml
from pathlib import Path
workflow = yaml.safe_load(Path('.github/workflows/ci.yml').read_text())
job = workflow['jobs']['openclaw']
for step in job['steps']:
    if step.get('run'):
        print(step.get('name', ''), step['run'])
PY
```

Saída relevante:

```text
OpenClaw read-only smoke
python -m engines.openclaw --preview
test -z "$(git status --porcelain -- learner/)"
```

`git show 030c583` confirma que esse commit adiciona o job read-only com `--preview` na matriz de CI.

### Limitação crítica de release/correlação de SHA

- `origin/main` ainda não contém `030c583`; `git log --oneline origin/main..main` mostra:
  - `9d4b744` e `030c583`.
- Consulta ao histórico remoto de runs (`gh run list --limit 300 ...`) não retornou runs para os SHAs iniciados por `030c583` ou `9d4b744`.
- O último run remoto conhecido da `main` é `32586620642` (`headSha 3586cb587...`), com job `openclaw` listado como
  `openclaw unit tests` + `openclaw simulate`, ou seja, anterior aos commits locais e sem a nova definição de smoke read-only.

Sem `run publicável` para `030c583` ou `9d4b744`, **a evidência fica restrita a validação local independente**, e não há como
atestar a correlação run green + SHA até a publicação e observação do SHA-alvo em CI.

## Decisão de GO/NO-GO solicitada

- AID-80: `GO (condicional)` para comportamento read-only em ambiente local validado; pendente validação em CI publish do SHA.
- AID-79: `NO-GO` por ausência de evidência rastreável nesta validação (fora do escopo técnico desta issue).
- AID-46: `NO-GO` por ausência de evidência rastreável nesta validação (fora do escopo técnico desta issue).

## Disposição da issue (handoff)

**Status da trilha:** `blocked` por limitação de evidência de publicação (SHA não publicado em CI após `030c583`).
Criticidade do bloqueio: alta, pois impede confirmar o requisito explícito de “run green + SHA” em ambiente pós-publicação.
