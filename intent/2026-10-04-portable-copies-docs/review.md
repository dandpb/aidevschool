# Revisão independente R9

**PASS local**, 2026-10-04. Revisor: agente Codex em contexto separado do
produtor; HEAD `b9f77774643b94bfd9fafbd756a1b17482c33e45`. Recomendo aceitar
esta fatia documental. Não constitui aprovação humana nem autorização de ship.

Escopo autorizado pela delegação: página `17_portable_copies.md`, única entrada
R9 no índice e registros locais. Li AGENTS raiz/docs, REVIEW.md, intent/spec/plan,
fontes dos quatro pares, teste de paridade, instalador/validação, loader, guard,
lock/pins e mapa R7. Esta revisão escreveu somente este arquivo.

## Passes e provas próprias

- **Correção vs plano — PASS.** Os quatro pares estão exatos. A página orienta
  começar pelo gate, consultar a contraparte e seu teste; distingue entry scripts
  e conteúdo autoral. Não inventa gerador no instalador ou fonte privilegiada entre
  os três peers harness-eval. A fronteira MVP/canonical mastery permanece intacta.
- **Testes/evidência — PASS no recorte documental.** Executei por stdin somente
  o helper `_comparable_definitions`, extraído por AST do teste existente, sem
  importar o teste ou runtimes. Resultado independente:

  | Par | Definições | AST igual | Bytes iguais |
  | --- | --- | --- | --- |
  | core / _core | 39 | Sim | Não |
  | engine / _engine | 11 | Sim | Não |
  | state / _state | 10 | Sim | Não |
  | state_transitions / _state_transitions | 11 | Sim | Não |

  A seleção inclui funções/classes top-level e `ast.Assign` uppercase, remove
  docstrings e exclui imports; não cobre todo código de módulo. Conferi os imports
  `learner.gate.core`/`_core`, `.state_transitions`/`_state_transitions` e importlib
  no bundle. Assim, o comentário antigo byte-for-byte não é a prova efetiva.
  Li as saídas reais `install-check.txt` e `vendored-guard.txt`, coerentes com os
  exits 0 registrados pelo produtor em [evidence.md](evidence.md); não repeti esses
  comandos ou suites inalteradas.
- **Convenções — PASS.** Instalação copia a árvore entregue, inicializa estado e
  registra revisão; `--check` retorna após currículo/manifest, antes de instalação.
  O guard default verifica os peers e fixture temporária. `source=local` usa pin;
  o hash de proveniência ignora dotfiles/dotdirs e `__pycache__`, enquanto a
  comparação entre cópias é separada. `--update-pins` escreve o arquivo de pins.
  A página delimita o lock corrente a harness-eval e remete as projeções a R7.
- **Higiene/preservação — PASS.** Resolvi os 21 links efetivos da página final e
  conferi whitespace. Rehash independente dos 6.381 arquivos do baseline encontrou
  6.380 iguais e somente README diferente. Remover a linha R9 reproduz exatamente
  `handbook-before-r9.md`; R5/R7 e todos os registros prévios R2a permanecem iguais.
  Nenhuma alteração de fontes, testes, scripts, hooks, skills, pins ou estado.
  A revisão de simplificação não encontrou duplicação que exija ampliar o diff.

## Finding resolvido

**Important, corrigido antes do parecer final:** a versão inicial atribuía
configuração de allowlist à instalação. Em `install.py`, `install()` chama
`verify_skill_available()`, que apenas consulta `skills list`; não escreve
allowlist. O produtor removeu `/allowlist` da página. Conferi o trecho final
contra esse fluxo e o SHA-256 final abaixo. Sem findings abertos.

## Identidade e limites

| Artefato | SHA-256 conferido |
| --- | --- |
| Página final | `eba2c730882dfc283b01acc73b4d5f41a1a7c2a4d1eb582c1ab497bbaac0261d` |
| README final | `7bf304968dc6fa807f8517a35d0f6b14c894eaa8f6ffa2bd4dbea77b513abc72` |
| Baseline `/tmp/aidevschool-r9-evidence/before-r9-hashes.json` | `c093ac63a041fec7f605644986f3786fef00c1da55310fbff174f10b1f0fe083` |
| Teste de paridade existente | `30d4cd61c8df29e5d37208f278deafe770516598f14dcdaa1162e490a887b433` |

Nenhuma prova de comportamento completo instalado foi executada; AST e checks
documentados não estabelecem tal equivalência. Não importei analytics, instalei,
agendei, executei self-test/update-pins ou mudei permissões. `rtk` indisponível:
leituras e verificações usaram comandos diretos. Sem commit/publicação. R2a
continua autorizada no recorte anterior e bloqueada pela transferência técnica;
nenhum download, reconstrução ou aplicação de patches foi tentado.
