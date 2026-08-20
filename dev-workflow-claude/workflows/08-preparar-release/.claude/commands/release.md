---
description: Portão de release — testes verdes, changelog derivado dos commits, bump semver coerente e tag anotada
---

Prepare um release deste projeto passando pelo portão completo. Argumentos opcionais: `$ARGUMENTS` (se contiver `major`, `minor` ou `patch`, use como override do bump; se vazio, derive o bump dos commits).

Execute os passos NA ORDEM. Se qualquer passo falhar, ABORTE e reporte — nunca pule o portão.

## Passos

1. **Suíte completa primeiro.** Rode a suíte de testes do projeto (ex.: `npm test`). Se qualquer teste falhar, aborte imediatamente: não existe release com teste vermelho. Cole a saída como evidência.

2. **Ler os commits desde a última tag.** Descubra a última tag com `git describe --tags --abbrev=0` (se não existir tag, use todos os commits do histórico). Liste com `git log <ultima-tag>..HEAD --oneline`. Se não houver commit novo, aborte: nada a lançar.

3. **Classificar por convenção e decidir o bump.** Para cada commit:
   - `feat:` → candidato a **minor**
   - `fix:` → candidato a **patch**
   - `feat!:`/`fix!:` ou corpo com `BREAKING CHANGE:` → **major**
   - outros tipos (`chore:`, `docs:`, `refactor:`, `test:`...) → não elevam o bump
   O bump final é o mais alto encontrado (major > minor > patch). Se `$ARGUMENTS` trouxe um bump explícito, ele vence — mas registre a divergência. Commits fora da convenção: liste-os e classifique como patch, avisando o usuário.

4. **Gerar/atualizar `CHANGELOG.md`.** Prepend (mantendo o histórico anterior) uma seção `## vX.Y.Z — <data ISO>` com os commits agrupados por tipo (`### Features`, `### Fixes`, `### Breaking Changes`, `### Outros`), cada linha citando o hash curto e a mensagem. Nada de inventar entradas: só o que está no `git log`.

5. **Bump de versão.** Atualize o campo `version` do manifesto do projeto (`package.json` ou equivalente) aplicando o bump decidido no passo 3 sobre a versão atual. A nova versão DEVE ser exatamente a mesma do título do changelog e da tag.

6. **Commit de release + tag anotada.** Commit contendo apenas o manifesto e o `CHANGELOG.md`, com mensagem `chore(release): vX.Y.Z`. Em seguida crie a tag anotada: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.

7. **Verificação final (portão).** Prove, com saídas reais:
   - `git tag -l` contém a nova tag e `git describe --tags` aponta para ela;
   - cada commit listado no passo 2 aparece no `CHANGELOG.md` (compare os hashes);
   - a versão no manifesto == versão da tag == título da nova seção do changelog;
   - a suíte continua verde no commit taggeado.
   Se qualquer checagem falhar, desfaça a tag (`git tag -d`) e reporte o que quebrou em vez de entregar um release inconsistente.

## Regras

- Nunca use `--force`, nunca mova tag existente.
- Não faça push: publicar é decisão humana; termine mostrando o comando sugerido (`git push --follow-tags`).
- Relate ao final: bump aplicado e por quê, commits incluídos, e o resultado de cada checagem do passo 7.
