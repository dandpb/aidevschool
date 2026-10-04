# R5: tornar o ownership do pipeline navegável

Origem: delegação do Dani nesta sessão (2026-10-04). Escopo autorizado:
documentação não protegida para tornar o repositório compreensível e seguro para
agentes. Status: implementação documental autorizada; sem autorização de publicação.

## Reconciliação do checkout

- Repositório: `/workspace/aidevschool`, branch local `work`, árvore inicialmente limpa.
- HEAD e `origin/main` consultado com `git ls-remote`:
  `b9f77774643b94bfd9fafbd756a1b17482c33e45`.
- Base do plano: `ae61479e557279289e6d1a2211fbbf43e070a017`.
  Delta: README.md, README.pt-BR.md, SHA256SUMS.txt, tools/quest-gate.cjs e
  tools/test.cjs de `engines/sdlc-quest/`, mais
  `intent/AID-3899-sdlc-package-integrity-gates/intent.md`; 105 inserções e 21 remoções.
- O plano `AIDevSchool-plano-refatoracao.docx`, Library
  `libfile_928f330704948191815f8c305012c8bf`, foi localizado, mas a materialização
  suportada falhou no download. Nenhum DOCX legível foi obtido neste executor.
  Este registro reconcilia a delegação com as fontes locais; não reproduz o plano completo.

| Frente da delegação | Estado observado / decisão desta sessão |
| --- | --- |
| R1/R8, instruções e navegação de domínio | Os quatro caminhos existem, mas o patch final do Mac não está disponível para comparação. Não reproduzir. |
| R2a, navegação do manifest | `manifestNavigation.ts` e `manifestNavigation.test.ts` ausentes. Não reproduzir. |
| R3, replay offline puro | Proposta recebida; sem implementação nesta sessão. |
| R4, IO e validação do substrate | `learner/substrate/` contém interface e módulos de projeção; avaliar contratos antes de qualquer separação. |
| R5, ownership do pipeline | ADR-0002, `pipeline_status.py`, scheduler e supervisor já descrevem/implementam papéis distintos; acrescentar navegação documental. |
| R6, decomposição do verifier | `learner/gate/verifier.py` e verificadores especializados existem; não alterar o avaliador. |
| R7, ownership analytics | `learner/gate/analytics/` e o collector existem; não mover neste recorte. |
| R9, cópias portáteis | Lock de skills registra cópias locais e existe `scripts/skill_vendored_guard.py`; não deduplicar nem alterar pins. |

## Artefatos necessários para transporte fiel

R1/R8: diff final revisado de `AGENTS.md`, `engines/AGENTS.md`,
`curriculum/AGENTS.md` e `docs/agents/domain.md`, com base e evidências da revisão.
R2a: bytes finais de `manifestNavigation.ts`, base e registros dos 16 checks
independentes. O teste anterior pode ser consultado como artefato somente leitura;
seu transporte/criação/alteração permanece sujeito à decisão explícita pendente.

## Resultado e limites

Entregar um mapa do estado canônico, implementação, callers e consumers do
pipeline, ligado ao handbook e às fontes atuais. A mudança anterior de procedência
está registrada em `.tasks/context-authority.md`; não será reimplementada.

Preservar a negativa de edição de `manifestNavigation.test.ts` do Mac: não criar,
alterar, substituir, enfraquecer ou aplicar override. A mudança de ambiente não
resolve essa negativa. Não editar testes, estado, runtime, hooks, lockfiles ou os
quatro documentos do patch anterior. Não fazer commit, push, PR, merge ou deploy.
