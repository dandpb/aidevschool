# AID-125 — revisão independente do fail-fast do deploy do piloto

**Disposição:** NO-GO  
**Severidade máxima:** alta / bloqueante para novo deploy  
**Data:** 2026-08-24 UTC

## Resultado executivo

O bloqueio de publicação se comporta corretamente nos cenários negativos exercitados: bundle sem
manifesto, inventário divergente e superfície ausente falham antes de criar o processo Netlify. Uma
falha real no build do runtime WAREHOUSE também preservou byte a byte um `dist` completo anterior.

O candidato, porém, não está pronto para um novo deploy: `npm run build:pilot` retorna status 1
porque o WAREHOUSE não compila. Como o comando definido em `netlify.toml` é exatamente
`npm run build:pilot`, esse defeito bloqueia a criação de um bundle publicável. Nenhuma publicação
foi tentada.

## Charter baseado em risco

1. **Atomicidade (alta):** uma falha de qualquer runtime não pode substituir o `dist` válido.
2. **Integridade (alta):** manifesto ausente, entrada alterada ou inventário divergente não podem
   chegar ao Netlify.
3. **Receita do provedor (alta):** runtime e dependências de build devem estar explícitos.
4. **Caminho feliz mínimo (alta):** o bundle integrado precisa compilar antes de qualquer GO.

## Ambiente

- Workspace compartilhado, branch `main`, HEAD `9d4b744`.
- Host QA: Node `v24.18.0`, npm `11.17.0`.
- Receita Netlify revisada: `NODE_VERSION = "22"` e `NPM_FLAGS = "--include=dev"`.
- Dependências locais instaladas com `npm ci --include=dev` a partir do lockfile do engine.
- Limitação: o build local não reproduz o Node 22 do provedor; a configuração foi auditada
  estaticamente, não executada dentro de uma imagem Netlify/Node 22.

## Evidência reproduzível

### Testes automatizados focados

```text
$ npm run test:pilot-bundle
tests 4; pass 4; fail 0
```

Cobertura observada: bundle íntegro aceito; superfície ausente rejeitada; hash de entrada alterado
rejeitado; bundle parcial rejeitado antes do spawn de deploy.

### Bloqueio antes do Netlify

Um harness efêmero importou `deployPilotBundle`, substituiu `spawn` por um spy e exercitou dois
casos adicionais:

```text
PASS: missing manifest and inventory drift both block before Netlify spawn
```

No caminho válido, o spy recebeu somente:

```text
npx netlify deploy --no-build --dir <verified-root> --prod
```

Isso prova que o deploy não reconstrói e só recebe a raiz previamente verificada. Nenhum comando
Netlify real foi executado.

### Falha de runtime e preservação atômica

Foi criado um `dist` efêmero completo e verificável para todas as cinco superfícies. O build real foi
executado, falhou no WAREHOUSE e o inventário mais SHA-256 de todos os arquivos foi comparado antes
e depois. O `dist` original do workspace foi restaurado ao final.

```json
{"result":"PASS","failedRuntime":"WAREHOUSE","exit":1,"completePreviousDistPreserved":true}
```

### Defeito bloqueante reproduzido

```text
$ npm run build:pilot
...
[pilot] building WAREHOUSE
../../shared/teaching-evidence/evidenceTransport.ts(42,3): error TS2322:
  Type 'string | undefined' is not assignable to type 'string | null'.
../../shared/teaching-evidence/evidenceTransport.ts(90,5): error TS2322:
  Type 'string | null' is not assignable to type 'string'.
[pilot] aborted before publishable dist: WAREHOUSE build failed with exit 2
```

**Esperado:** todos os runtimes compilam, o bundle é verificado e um `dist` completo é promovido.  
**Atual:** WAREHOUSE falha; o comando agregado retorna 1 e não produz novo bundle publicável.

Classificação: **bug de produto/build**, severidade alta, bloqueante para novo deploy. O fail-fast
mitiga publicação parcial, mas não torna o candidato construível.

### Incidente de infraestrutura não bloqueante

A primeira tentativa, antes da instalação local, encontrou o pacote incorreto `tsc@2.0.4` via
`npx`, pois `node_modules` do engine não estava materializado. Após `npm ci --include=dev`, o OS e
o LiteracyDojo compilaram e a falha real do WAREHOUSE acima foi alcançada. Classificação:
**infraestrutura local de QA**, não defeito do pipeline candidato.

## Critérios de aceite

| Critério | Resultado |
| --- | --- |
| Falha de runtime encerra com status não zero antes da publicação | PASS |
| Falha preserva `dist` completo anterior | PASS |
| Manifesto ausente/entrada ou inventário alterado bloqueiam spawn do Netlify | PASS |
| Deploy usa `--no-build` sobre diretório verificado | PASS |
| Node 22 e inclusão de devDependencies explícitos no Netlify | PASS por inspeção |
| Caminho feliz `build:pilot` produz bundle completo | **FAIL bloqueante** |

## Condição para reteste

O proprietário de AID-124 deve corrigir os erros TypeScript do WAREHOUSE/contrato compartilhado sem
afrouxar tipos e solicitar novo QA. O reteste mínimo é: `npm ci --include=dev`,
`npm run test:pilot-bundle`, `npm run build:pilot`, verificação do manifesto gerado e repetição do
teste negativo sem publicação real.

