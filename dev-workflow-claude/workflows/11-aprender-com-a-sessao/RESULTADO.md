# Workflow 11 — Retro que vira regra

## Problema que resolve

Toda sessão com IA produz correções humanas ("não instala dependência!", "roda os testes antes de dizer pronto!") que evaporam quando a sessão fecha — e o erro se repete na próxima. O comando `/aprender` fecha o loop: revisa a sessão, destila cada erro em regra curta e verificável no CLAUDE.md e, quando automatizável, transforma a regra em checagem executável plugada no `npm test`. Regra que não roda, se esquece; regra que roda em todo teste, nunca mais é violada em silêncio.

## O comando

`.claude/commands/aprender.md` — genérico, funciona em qualquer projeto. Passos que codifica:

1. **Revisar a sessão** (ou transcrição passada em `$ARGUMENTS`): listar cada erro, repetição ou correção humana.
2. **Destilar** cada lição em regra de uma linha, começando com verbo, verificável — lição vaga é descartada.
3. **Atualizar o CLAUDE.md** mostrando o diff antes/depois.
4. **Automatizar o que der** em `tools/checar-regras.sh`, plugado no `npm test`.
5. **Validar cada checagem**: plantar violação → ver falhar; remover → ver passar. Checagem que não foi vista falhando não conta.
6. **Resumo final** do que virou check e do que ficou só como regra textual.

## Execução real

Projeto demo: `demo/` (CLI `tempo`, Node 22 puro, `node:test`). Insumo: `demo/TRANSCRICAO.md`, sessão com 2 erros clássicos — (a) agente rodou `npm install dayjs` num projeto zero-deps; (b) agente declarou "pronto" sem rodar `npm test` (2 testes estavam quebrados).

**Passo 1–2 — lições destiladas da transcrição:**
- Erro 1 (10:05): dependência npm adicionada; humano reverteu → regra automatizável (inspecionar `package.json`).
- Erro 2 (10:31): "pronto" sem rodar testes → parte comportamental (colar saída do `npm test`) + parte automatizável (garantir que o script `test` existe e executa `node --test`).

**Passo 3 — diff real do CLAUDE.md:**

```diff
--- CLAUDE.md (antes)
+++ demo/CLAUDE.md (depois)
@@ -10,3 +10,7 @@
 3. Zero dependências externas; apenas stdlib do Node.
 4. Produtor ≠ verificador: antes de dar por pronto, delegue a auditoria ao subagente `verificador`.
 5. Mensagens de commit em inglês, referenciando a spec — ex.: `feat: duration parser (spec parse-duracao)`.
+
+## Regras aprendidas (retro de 2026-08-19 — /aprender)
+6. Nunca instale pacotes npm: `package.json` não pode ter `dependencies` nem `devDependencies` (checado por `tools/checar-regras.sh`).
+7. Rode `npm test` e cole a saída antes de declarar qualquer tarefa como pronta (o script `test` deve existir e executar `node --test`; checado por `tools/checar-regras.sh`).
```

**Passo 4 — nasceu `demo/tools/checar-regras.sh`** (2 checagens, uma por regra) e o `npm test` foi plugado:

```diff
--- package.json (antes)
+++ demo/package.json (depois)
   "scripts": {
-    "test": "node --test"
+    "test": "bash tools/checar-regras.sh && node --test"
   }
```

Baseline após o fluxo (`npm test`, saída real):

```
OK    regra 6: zero dependências npm
OK    regra 7: script test existe e roda node --test
checar-regras: todas as regras OK.
...
# tests 4
# pass 4
# fail 0
exit=0
```

**Passo 5 — validação das checagens (saídas reais):**

Violação 1 plantada (`"dependencies": { "dayjs": "^1.11.13" }` no package.json):

```
dependências encontradas: dayjs
FALHA regra 6: package.json declara dependencies/devDependencies (projeto é zero-deps)
OK    regra 7: script test existe e roda node --test
checar-regras: FALHOU — corrija as violações acima antes de prosseguir.
exit=1
```

Violação 1 removida:

```
OK    regra 6: zero dependências npm
OK    regra 7: script test existe e roda node --test
checar-regras: todas as regras OK.
exit=0
```

Violação 2 plantada (script `test` removido do package.json):

```
OK    regra 6: zero dependências npm
FALHA regra 7: package.json sem script test executando node --test
checar-regras: FALHOU — corrija as violações acima antes de prosseguir.
exit=1
```

Violação 2 removida — estado final (`npm test`):

```
# tests 4
# pass 4
# fail 0
exit=0
```

**Passo 6 — resumo:** 2 regras adicionadas ao CLAUDE.md; 2 checagens criadas e validadas (cada uma vista falhando e passando). A parte "colar a saída do npm test antes de dizer pronto" ficou só textual — depende do comportamento do agente na conversa, não é verificável por script.

## Como reproduzir

```bash
cd workflows/11-aprender-com-a-sessao/demo

# 1) Estado após o /aprender: regras checadas + 4 testes passando
npm test

# 2) Planta a violação da regra 6 (dependência npm) e prova que o check FALHA
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.dependencies={dayjs:"^1.11.13"};fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if bash tools/checar-regras.sh; then echo "ERRO: o check deveria ter falhado"; exit 1; fi
echo ">>> check falhou com a violação plantada, como esperado"

# 3) Remove a violação e prova que o check volta a PASSAR
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));delete p.dependencies;fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
bash tools/checar-regras.sh
echo ">>> fluxo reproduzido com sucesso"
exit 0
```

## Valor para o dev

- **Correções humanas viram capital permanente:** o "não faz isso de novo" deixa de morrer com a sessão e passa a valer para toda sessão futura (CLAUDE.md é lido sempre).
- **Regra automatizada não depende de memória de ninguém:** a violação quebra o `npm test` no segundo em que acontece — humano ou IA, tanto faz quem errou.
- **Checagem validada nos dois sentidos:** o próprio fluxo exige ver o check falhar com violação plantada e passar sem ela, eliminando checks decorativos que nunca pegam nada.
