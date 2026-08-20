# dev-workflow-claude — página educativa + biblioteca de workflows testados

## Comandos
- Auditar a biblioteca inteira: `node tools/auditar-workflows.mjs` (exit 0 = todos os fluxos reproduzem)
- Testar o caso base: `cd exemplo-pratico && npm test`

## Estrutura
- `index.html` + `styles.css` — página educativa (12 partes; HTML+CSS puros, sem JS)
- `exemplo-pratico/` — workflow 01 (`/nova-feature`), o caso da Parte 10
- `workflows/NN-slug/` — comando genérico + `demo/` executado + `RESULTADO.md` com evidência
- `.claude/skills/` — manutenção: `auditar-workflows`, `novo-workflow`, `verificar-workflow`

## Regras
1. **Evidência real ou nada**: todo número na página vem de execução; nunca edite saídas na mão.
2. Todo fluxo tem bloco `## Como reproduzir` (`RESULTADO.md`; no exemplo-pratico, `README.md`): UM bloco bash, caminhos relativos a esta raiz, terminando com exit 0 — é o contrato de manutenção; a auditoria falha sem ele ou com caminho absoluto.
3. **Produtor ≠ verificador**: quem cria ou conserta um fluxo não dá o próprio veredito; use `verificar-workflow`.
4. **Preserve o "antes"**: estado pré-correção fica em commit, log ou cópia — alegação histórica sem artefato reprova.
5. Mudou fluxo, demo ou página? Rode a auditoria e atualize a Parte 11/12 do `index.html` com os números novos.
6. Demos: Node puro, zero dependências npm, `node:test`. Git apenas dentro de `demo/` quando o fluxo exigir.
7. Os históricos git embutidos dos demos 02/04/06/08 não são versionados diretamente; ficam em `workflows/*/git-historico.bundle`. Num clone novo, rode `bash tools/restaurar-git-demos.sh` (preserva os hashes citados nos `RESULTADO.md`) antes da auditoria.
