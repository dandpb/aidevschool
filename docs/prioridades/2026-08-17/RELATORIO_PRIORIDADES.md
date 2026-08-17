# Relatório consolidado — prioridades e testes

**Data:** 2026-08-17  
**Repositório:** `aidevschool`, branch `main`  
**Escopo:** selecionar dez prioridades reais, aplicar o workflow proposto nas três primeiras e
separar evidência observada de proposta.

## Resultado executivo

Há agora três reduções concretas de risco:

1. a entrada pública de LiteracyDojo está documentada no README;
2. o piloto estático do CodexDojo OS monta localmente duas missões representativas a partir de
   quatro runtimes empacotados;
3. artefatos locais conhecidos deixam de ser candidatos silenciosos ao Git.

Isso **não significa que a plataforma esteja pronta**. O próximo passo recomendado é usar a entrada
LiteracyDojo com alunos reais, observar a primeira jornada e medir bloqueios antes de expandir
engines, agentes ou currículo.

## Método aplicado

Para cada caso prioritário:

```text
caso real → PRD → SPEC → CONTEXTO → PLAN → RED → correção mínima → GREEN → limites
```

O produtor e o verificador permaneceram separados. Nenhuma execução marcou mastery, alterou o
estado canônico do learner ou publicou uma nova versão.

Casos detalhados: [`CASOS_REAIS.md`](CASOS_REAIS.md).

## Top 10 prioridades atuais

A ordem combina risco de não entregar, impacto na primeira experiência e esforço de fechamento.
Os três primeiros são os casos que receberam RED→GREEN nesta rodada.

| # | Prioridade | Evidência fresca no repo | Próxima ação | Estado |
|---:|---|---|---|---|
| 1 | Tornar a entrada IA Prática encontrável | `README` em `HEAD` dizia que não havia rota pública; LiteracyDojo respondeu HTTP 200 | Manter link e observar uso real | **corrigida/testada — C03** |
| 2 | Tornar o piloto OS reproduzível em build estático | `netlify.toml` em `HEAD` não declarava `build:pilot` nem quatro URLs `/apps/*` | Incluir os arquivos de suporte no release e adicionar smoke ao CI | **corrigida/testada localmente — C02; release pendente** |
| 3 | Impedir versionamento acidental de artefatos locais | `.env*`, zip de debug e `test-results-pilot/` não estavam cobertos no baseline | Manter verificador no caminho de entrega | **corrigida/testada — C01** |
| 4 | Separar o working tree em entregas revisáveis | Corte atual observado com 76 linhas de status, mudanças de várias frentes e arquivos não rastreados | Classificar e separar por commits/branches antes de publicar | aberta |
| 5 | Colocar `test:smoke:pilot` no CI | Busca em `.github/workflows/ci.yml` não encontrou esse comando | Criar job de build estático com Playwright | aberta |
| 6 | Medir ativação e feedback de um aluno real | Existem 3 attempts e 1 receipt, mas isso não prova uso de uma turma | Rodar piloto curto com uma jornada observável e feedback explícito | aberta |
| 7 | Reconciliar catálogo e evidência curricular | `catalog.md` registra 18 projetos, a maioria `scaffolded`; U2 Go/Rust ainda `unverified` | Certificar por implementação ou manter status honesto com provas | aberta |
| 8 | Fechar o contrato mínimo de feedback/analytics | ADR existe, mas busca atual não encontrou sink/eventos ativos no LiteracyDojo; mudanças de analytics estão deletadas no working tree herdado | Decidir restaurar o mínimo ou arquivar o contrato, sem texto livre | aberta |
| 9 | Fazer receipts sobreviverem a crash | `engines/pixelDojo/verifier/__init__.py:320` usa `write_text()` direto; helper atômico existe no substrate | Criar teste de interrupção e usar escrita atômica | aberta |
| 10 | Medir peso do primeiro carregamento | Build do piloto emitiu warnings de chunks >500 kB em wormhole e relay-station | Medir primeira interação antes de decidir code splitting | aberta |

### O que não subiu para o ranking

O audit histórico citava review slices possivelmente manuais e divergência de AIDI. A evidência
fresca consultada mostra review slices com cabeçalho de geração do substrate e o OS lendo AIDI do
campo canônico `learner.aidi.current`; por isso esses itens não foram tratados como prioridade
aberta sem nova prova de quebra.

## Teste 1 — C01 / P3 do produto: higiene do working tree

### RED

O verificador falhou antes das regras do `.gitignore` serem adicionadas. O relatório não repete
uma lista de saída que não foi preservada; os quatro caminhos do caso estão documentados em
`caso-p1-higiene/VALIDACAO.md`.

### Correção

`.gitignore` passou a cobrir:

- `.env` e variantes `.env.*`, preservando `.env.example`;
- `kimi-debug-session_*.zip`;
- `**/test-results-pilot/`.

A correção não apagou arquivos, não abriu valores de ambiente e não rotacionou credenciais.

### GREEN

```text
hygiene verification: PASS
ignored paths: 4
tracked sensitive candidates: 0
values inspected: no
```

Também passou `git diff --check`.

### Entregue

Regra de ignore e verificador reproduzível. Não entregue: auditoria de conteúdo dos ambientes,
limpeza do working tree ou rotação de segredos.

## Teste 2 — C02 / P2 do produto: build estático do OS

### RED

Contra o `netlify.toml` do `HEAD`, o verificador encontrou cinco ausências:

```text
pilot config verification: FAIL
missing: VITE_LITERACYDOJO_URL = "/apps/literacydojo/"
missing: VITE_RELAY_STATION_URL = "/apps/relay-station/"
missing: VITE_WAREHOUSE_URL = "/apps/warehouse/"
missing: VITE_WORMHOLE_URL = "/apps/wormhole/"
missing: build command = npm install && npm run build:pilot
```

### Correção

`engines/codexdojo-os-prototype/netlify.toml` agora declara o comando `build:pilot` e as quatro
URLs relativas `/apps/*`, sem depender de `.env.production` local. Nesta rodada, somente as quatro
URLs foram adicionadas; o comando já estava presente como mudança não commitada no working tree.

### GREEN

Contrato:

```text
pilot config verification: PASS
bundled mission runtimes: 4
relative runtime URLs: 4
local dev-server dependency in Netlify config: no
```

Smoke estático:

```text
4 mission runtimes bundled into dist/apps/.
2 passed (5.5s)
```

As duas missões representativas — IA Prática e WAREHOUSE — montaram com `vite preview`, sem
subir dev-server das missões.

### Entregue versus herdado

**Alterado nesta rodada:** variáveis versionáveis no `netlify.toml`.  
**Já existente no working tree quando a rodada começou e apenas validado:**

- comando `build:pilot` no `netlify.toml`;
- `scripts/bundle-missions.mjs`;
- `playwright.pilot.config.ts`;
- `tests-pilot/pilot-build.smoke.spec.ts`;
- suporte `build:pilot` no `package.json`.

Esses arquivos ainda aparecem como não rastreados. Portanto o resultado é verde localmente, mas
**não é release-ready** até eles serem incluídos no commit/release correspondente. O warning de
chunks >500 kB permanece.

## Teste 3 — C03 / P1 do produto: entrada pública

### RED

Contra `git show HEAD:README.md`:

```text
public entry verification: FAIL
- missing public LiteracyDojo link: https://aidevschool-literacydojo.netlify.app
- stale no-public-route sentence is still present
```

### Correção

`README.md` aponta LiteracyDojo como primeira rota browser-only pública, local-first e sem conta,
preservando a separação da trilha Dev/OS.

### GREEN

```text
public entry verification: PASS
public LiteracyDojo link: present
stale no-public-route sentence: absent
Dev track scope: unchanged
```

Disponibilidade observada:

```text
literacydojo_http=200
```

### Limites

Não houve deploy novo nem teste com aluno real. HTTP 200 prova disponibilidade no momento da
checagem, não retenção, conclusão ou aprendizagem.

## O que foi realmente entregue nesta rodada

### Código/configuração/documentação alterados

- `.gitignore` com proteção para artefatos locais conhecidos.
- `engines/codexdojo-os-prototype/netlify.toml` com comando e URLs do build estático.
- `README.md` com a entrada pública verificável.
- três verificadores Python para tornar os contratos reproduzíveis.
- PRDs, specs, contexto, planos e validações dos três casos.
- este relatório e `CASOS_REAIS.md`.

### Trabalho validado, mas não criado nesta rodada

- bundle dos quatro runtimes do piloto;
- configuração Playwright do piloto;
- smoke de duas missões;
- script `build:pilot`.

Esses arquivos já estavam no working tree e continuam não rastreados. Não atribuo sua criação a
esta rodada nem afirmo que um clone limpo já os possui.

### Não entregue

- commit ou push;
- novo deploy;
- backend, conta ou analytics funcional;
- piloto com aluno real;
- certificação de Go/Rust do currículo;
- limpeza das mudanças de outras sessões;
- status de mastery alterado.

## Validação final executada

A bateria final foi executada depois dos documentos e produziu:

| Verificação | Resultado real |
|---|---|
| `verify_hygiene.py` | `PASS`; 4 caminhos ignorados; 0 candidatos rastreados; valores não inspecionados |
| `verify_pilot_config.py` | `PASS`; 4 runtimes; 4 URLs relativas; sem dependência de dev-server local na configuração |
| `verify_public_entry.py` | `PASS`; link presente; frase stale ausente; escopo Dev inalterado |
| `npm run test:smoke:pilot` | 4 runtimes empacotados; 2 testes passaram em 6.4s |
| `python3 -m learner.substrate --check` | estado canônico e projeções geradas sincronizados |
| `python3 -m pytest -q` | 693 passaram, 1 skipped, 65 subtests passaram em 14.23s |
| `python3 docs/curso/validate_course.py` | PASS; 28 âncoras; 13 links locais; 0 recursos externos |
| `git diff --check` | PASS, sem saída |
| HTTP LiteracyDojo | `literacydojo_http=200` |

Esses resultados comprovam as verificações executadas neste corte. Não transformam os sete casos
restantes em trabalho concluído nem afirmam que o produto foi usado por alunos reais.

## Próxima decisão recomendada

Não atacar as outras sete prioridades em paralelo. Primeiro:

1. incluir os arquivos de suporte do piloto em uma entrega isolada;
2. manter LiteracyDojo como entrada simples;
3. observar uma jornada real de aluno;
4. registrar os bloqueios encontrados;
5. só então decidir se analytics, CI expandido, code splitting ou mais engines merecem investimento.
