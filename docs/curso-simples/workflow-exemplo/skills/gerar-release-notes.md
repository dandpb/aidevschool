# Skill — gerar-release-notes

**Quando usar:** sempre que precisar transformar um lote de commits em notas de
release legíveis, sem descartar nada silenciosamente.

**Promovida de:** `docs/curso-simples/workflow-exemplo/` (2026-08-21, 22 testes).

## Procedimento

1. Exporte os commits para JSON: lista de `{"hash", "message"}`.
   ```bash
   git log --pretty='{"hash":"%h","message":"%s"},' -N | sed '$ s/,$//'
   ```
   (ou gere com o próprio script de export — saída completa no exemplo do curso).
2. Rode o núcleo puro (stdlib apenas, offline):
   ```bash
   python3 release_notes.py commits.json --version vX.Y.Z
   ```
3. Revise a seção **Fora do padrão** antes de publicar: é o detector de commits
   que a equipe (ou agentes) escreveram fora do Conventional Commits.
4. Quebre a build se o JSON de entrada for inválido — nunca gere release vazio.

## Regras que esta skill codifica

- **Nada é descartado:** commit fora do padrão vira seção visível, não erro silencioso.
- **Falha fechada:** entrada sem `hash`/`message`, lista vazia ou descrição vazia → erro.
- **Determinismo:** mesma entrada, mesma saída (ordem da entrada preservada).
- **Núcleo puro:** parsing + render sem I/O; CLI é casca fina. Testar o núcleo,
  não o `git`.

## Armadilha já paga

`feat: ` (descrição vazia) NÃO é "fora do padrão" — é erro de entrada. Tratar
os dois como iguais esconde commit quebrado. Valide cada classe separadamente.
