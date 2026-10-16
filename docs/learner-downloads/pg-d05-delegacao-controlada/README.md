# Kit offline pg-d05 — delegação controlada (U10)

Downloads offline em **2 etapas cumulativas** da prática guiada
`pg-d05-delegacao-controlada` (U10 — execução guiada e agentes; competência
D6 com D2), extraída **byte-idêntica** do pacote aceito do
PR #646 @ `f7e3228a80cecc68e426e7d59d080a234d249104`
(`curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/`).
Nenhum conteúdo reautorado: o kit embala, não reescreve.

| Etapa | ZIP | Público | Conteúdo |
| --- | --- | --- | --- |
| 1 — prática | `zips/pg-d05-etapa-1-pratica.zip` | aprendiz | 13 arquivos learner-facing: enunciado, exemplo trabalhado, ALLOWLIST, rúbrica, plano aprovado, contrato, verificador, fixture e as duas rodadas do produtor (r1/r2) |
| 2 — docente | `zips/pg-d05-etapa-2-docente.zip` | docente/pós-tentativa | + os 4 arquivos de `guia-de-correcao/` (solução, veredito-r1 modelo, recibo-exemplo, recibo-falso) |

## Pré-requisitos

- Ter concluído **pg-d03 (U07, refatoração com rede de segurança) ou
  equivalentes** (pré-requisito declarado no enunciado do pacote aceito).
- Ferramentas locais: **Python 3** (stdlib), **git** e `sha256sum`.
  Nenhuma rede, conta, chave ou dependência nova em nenhum passo.

## Como usar (aprendiz)

1. Extraia `pg-d05-etapa-1-pratica.zip` numa pasta limpa → surge `pg-d05/`.
2. Confira a integridade: `cd pg-d05 && sha256sum -c INVENTARIO.txt` não
   funciona como checklist direto (o INVENTARIO tem formato
   `sha256  bytes  caminho`); use `awk '{print $1, $3}' INVENTARIO.txt |
   sha256sum -c -`.
3. Abra `enunciado.md` e siga a ordem dos passos — **contrato e plano ANTES
   do diff do produtor** (passo 1 do ciclo). Sessão alvo: 25–40 min.
4. Os comandos do enunciado rodam verbatim a partir de `pg-d05/`, ex.:
   `python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r1/diff-r1.patch`.
5. As âncoras de integridade que o enunciado busca no `MANIFEST.md` do
   pacote (ex.: sha256 de `insumos/fixture/testes.py` = `e1deddbf…`) estão
   no `INVENTARIO.txt` da etapa — o MANIFEST.md do pacote é metadado de
   proveniência e **não** é entregue no ZIP.
6. `python3 insumos/verifica_delegacao.py selftest` é contrato do
   **revisor/V&E** (ver ALLOWLIST.md do pacote): depende dos fixtures
   docentes e só reproduz `selftest: APROVADO (4 sondas)` com a **etapa 2
   extraída por cima da etapa 1** (mesma pasta) — o que aliás é uma boa
   autoverificação pós-tentativa.
7. Só abra a etapa 2 (docente) **após** a tentativa — enunciado §Limites.

## Fronteiras pedagógicas (decisões explícitas)

- **Etapa 1 não contém** nenhum arquivo de `guia-de-correcao/` e nenhuma
  etapa contém o `MANIFEST.md` (provenance-only). Verificadas
  mecanicamente por `verify_kit.py --check-zips`.
- A ordem das etapas é **disciplina declarada, não barreira segura**: o kit
  não controla quando você abre cada arquivo e não emite nota ou mastery.
- O exemplo trabalhado §"Como reproduzir" reproduz o histórico do demo do
  workflow `04-revisar-mudancas` a partir do **repo completo**
  (`git-historico.bundle`); no kit offline essa seção é leitura — a
  tentativa em si é 100% executável offline.

## Reprodução e verificação (revisor)

Na raiz deste diretio (clone do repo, stdlib apenas):

```
python3 packager.py --out /tmp/zips-build   # reconstrói os ZIPs
python3 verify_kit.py                        # 12 checks (fonte, ZIPs, execução, repro)
python3 verify_kit.py --report RELATORIO-VERIFICACAO.md
```

`verify_kit.py` prova com execuções reais: fonte vendored 18/18
byte-idêntica ao pin; inventário cumulativo exato por etapa; bytes internos
idênticos ao pin; fronteiras (etapa 1 sem gabarito; nenhum MANIFEST.md);
ciclo do aprendiz na extração limpa (escopo r1 REPROVADO exit 1, escopo r2
APROVADO exit 0, fixture V1 `6 testes passaram`); `selftest` V&E
`APROVADO (4 sondas)` na extração cumulativa; e duas reconstruções
byte-idênticas entre si e aos ZIPs commitados. Detalhes e hashes:
`manifests/pin-hashes.json`, `manifests/stages.json`, `PROVENANCE.md` e
`RELATORIO-VERIFICACAO.md`.

## Proveniência

- Fonte imutável: PR #646 @ `f7e3228a` (autoria AID-3647 aceita com review
  CPE + aprovação CCE; contraprovas AID-3656 12/12 + countersign no PR).
- Kit produzido na tarefa AID-3668 (Curriculum Content Engineer) —
  detalhes completos em `PROVENANCE.md`.
