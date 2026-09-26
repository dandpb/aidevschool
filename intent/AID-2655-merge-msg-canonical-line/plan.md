# Plan: AID-2655 merge-message canônica

Author: CEO (agent 501cb456) · Change-id: AID-2655-merge-msg-canonical-line ·
Status: approved (owner decision AID-2655 alternativa (a); small-fix/docs-only
scope, plan recorded per playbook)

## Files that change

1. `docs/sdlc/README.md` — §Merge protocol item 5: uma emenda
   ("Emenda merge-message canônica (AID-2655)") logo após a Emenda Stage-2:
   decisão (a) com rejeição registrada da (b), dupla superfície exigida
   (gate PR pré-merge + linha na merge message), registro do #514 como 4ª
   ocorrência MÉDIA com mitigações, e checklist binding de 3 passos do
   merge-writer (linha canônica montada antes do merge; veredito first-hand
   pré-merge; auto-grep pós-merge).
2. `intent/AID-2655-merge-msg-canonical-line/` — este registro.

## Order of work

Branch a partir de `origin/main` (`f680490f`) → emenda + registro → PR (o
guard fica VERMELHO no PR até a citação countersign válida — fail-closed por
design, este é exatamente o comportamento documentado) → dispatch QA Lead
fresh-context (child issue Paperclip) → veredito first-hand no carrier +
comentário no PR com `Countersign: AID-XXXX verdict <ref>` + trailer
`Provenance:` → re-run do check no head → CI verde → CEO single-writer merge
com a mensagem no template novo, incluindo a linha canônica → auto-grep
`git log -1 --grep '^Countersign: '` → recibo no carrier AID-2655 e
disposição final.

## Risks / proof

- Risco: emenda interpretada como licença para citar só no comentário do PR
  (leitura (b)) — mitigado pelo texto explícito "não a substitui" e pela
  rejeição registrada da (b) com os três motivos.
- Risco: merge train #515–#522 mergear sem a linha antes da emenda entrar —
  mitigado pelo checklist valer "a partir do merge train #515–#522" já na
  decisão, independentemente do merge desta emenda.
- Proof: (1) `git log -1 --grep '^Countersign: ' <merge-sha>` retorna a
  linha no merge desta própria emenda; (2) o texto da emenda contém o
  template e os 3 passos; (3) diff docs-only (sem código).
