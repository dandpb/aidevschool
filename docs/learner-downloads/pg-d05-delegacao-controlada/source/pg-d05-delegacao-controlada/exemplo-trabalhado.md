# pg-d05 — Exemplo trabalhado: revisar entrega delegada com prova executável (fonte real do repo)

> **Fontes primárias** (não reescritas aqui; consulte os originais na
> base `e01d9d42`): workflow `04-revisar-mudancas`
> (`dev-workflow-claude/workflows/04-revisar-mudancas/RESULTADO.md`,
> blob `4154bcf80d11`; prova `demo/test/media.test.js` blob
> `8b0379bcb4ac`), curso-simples M6–M8 (`docs/curso-simples/index.html`,
> blob `2bcf99fbd831`), workflow `11-aprender-com-a-sessao` (blob
> `345cf0576bdc`, checagens em `demo/tools/checar-regras.sh` blob
> `d7e8358b1fec`), ciclo 07 do workflow_lab
> (`docs/curso/workflow_lab/fixtures/07-cycle-07.json` blob
> `bd2a4cfdb5eb` — política `allowed_paths`/`max_files`/
> `max_changed_lines`, lição `fail-closed-narrow-policy`). O que segue é
> o roteiro pedagógico com as saídas reais citadas pelos originais.

## O caso (wf 04): proposta verde que devolvia "NaNm"

Mudança proposta: `mediaDuracoes` no CLI `tempo` (Node puro). A suíte da
proposta estava **verde** — `npm test`: `# tests 5 / # pass 5 / # fail
0`. A revisão não parou aí:

1. **Diff delimitado** — só o diff é revisado (`git diff HEAD`).
2. **Lentes independentes** — corretude por entradas-limite (lista
   vazia!), simplicidade (registry de 1 estratégia; cache que nunca
   acerta), testes (só caminho feliz).
3. **Prova executável do achado crítico** —
   `mediaDuracoes([])` → `"NaNm"` (evidência bruta); teste-prova criado
   e executado contra a proposta: `not ok 1 - PROVA-CRÍTICO:
   mediaDuracoes([]) deve lançar Error, nunca retornar "NaNm"`.
4. **Veredito** — PEDIR MUDANÇAS, com a tabela `arquivo:linha | problema
   | correção | gravidade`; o teste-prova fica no repo como critério de
   aceite da correção. Após corrigir: `# pass 8 / # fail 0`.

A lição estrutural (RESULTADO.md, "Valor para o dev"): **CI verde ≠
aprovado** — a proposta passava 5/5 nos próprios testes e ainda assim
quebrava a entrada-limite que ninguém testou.

## O protocolo do controlador (curso-simples M6–M7)

- **M6 (portões):** Plan Mode → humano aprova plano → Build em fatias →
  humano confere a validação. Frase proibida: "parece funcionar" —
  nunca substitui saída de comando. Validação em camadas após cada
  fatia: teste da fatia → suíte completa → **aceite no comportamento
  real**.
- **M7 (produtor ≠ verificador, "a regra inegociável"):** o verificador
  começa **do contrato e dos artefatos**, nunca da explicação do
  produtor — "não receba o raciocínio de quem produziu; tente refutar".
  No repo, um verificador de contexto fresco reprovou com 4/10 uma
  entrega que o produtor auto-avaliou 9/10.
- **Ciclo 07 (política estreita):** verificar diff unificado contra
  `allowed_paths` + limites de arquivos/linhas, **negando tudo que
  estiver fora da política** — fail-closed, sem julgamento de intenção.

## A retro que vira regra (wf 11)

Quando a sessão revela uma correção recorrente, ela não evapora: vira
regra curta no CLAUDE.md e, quando dá, checagem executável plugada no
`npm test` — **validada nos dois sentidos** (planta a violação, vê o
check FALHAR; remove, vê PASSAR). Regra que não roda, se esquece.

## O que o exemplo ensina — e onde a SUA prática é mais difícil

No wf 04, a suíte verde era **incompleta** (não cobria lista vazia) — o
verificador adicionou a prova que faltava. Na sua tentativa, a alegação
do produtor é **parcialmente verdadeira**: a suíte realmente roda verde
— porque **o próprio produtor editou o teste que denunciaria a
mudança**. Não basta adicionar prova; você precisa (a) checar o escopo
mecanicamente antes de qualquer narrativa (o diff toca arquivo proibido
e cria arquivo fora da allowlist), e (b) provar que o "verde" apresentado
foi **manufaturado** (sha256 do `testes.py` ≠ entregue) e que o aceite
congelado V3 diverge. Verificador que começa lendo o resumo do produtor
herda o viés; por isso o passo 1 da tentativa é contrato primeiro, diff
depois.

## Como reproduzir o exemplo (offline, sem instalar nada)

O histórico do demo **não** vive nas branches do repo (o default é
`main`): ele está congelado no `git-historico.bundle` ao lado de
`demo/`, e é de lá que se busca. Na raiz do seu clone (base
`e01d9d42`):

```bash
BUNDLE=dev-workflow-claude/workflows/04-revisar-mudancas/git-historico.bundle
git fetch "$BUNDLE" 'refs/heads/proposta:refs/heads/demo04-proposta' \
                     'refs/heads/master:refs/heads/demo04-master'
git worktree add /tmp/demo04-proposta demo04-proposta
git worktree add /tmp/demo04-master demo04-master

cd /tmp/demo04-proposta && node --test test/media.test.js
# ✖ PROVA-CRÍTICO: mediaDuracoes([]) deve lançar Error, nunca retornar "NaNm"
# ... fail 1, exit 1 — o achado crítico provado contra a proposta

cd /tmp/demo04-master && npm test
# ✔ PROVA-CRÍTICO ... 8 pass / 0 fail, exit 0 — verde só depois da correção

git worktree remove /tmp/demo04-proposta && git worktree remove /tmp/demo04-master
```

O formato do relatório varia com a versão do Node (spec `✖`/`✔` ou
TAP `not ok 1`/`ok 1`, como citado no RESULTADO.md); o invariante é o
nome `PROVA-CRÍTICO`, `fail 1`/exit 1 na proposta e 8/8 verdes no
master. O caminho do bundle na busca é relativo à raiz do repo (o
`git fetch` resolve a partir do topo), e `npm test` é `node --test`
puro — sem instalar dependências.
