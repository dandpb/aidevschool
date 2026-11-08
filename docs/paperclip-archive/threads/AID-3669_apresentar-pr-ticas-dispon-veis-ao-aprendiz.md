# AID-3669: Apresentar práticas disponíveis ao aprendiz

- **Status:** backlog | **Priority:** high | **Origin:** manual
- **Assignee:** UX Designer | **Created:** 2026-10-01T20:55:12.878086+00:00 | **Updated:** 2026-11-01T14:11:57.793+00:00
- **ID:** `eb907daf-d20d-4906-902c-cd6136a8d94b`

## Description

Entrega nova de entrada para o aprendiz aprovada pelo PO, apenas PREVIEW LOCAL, não publicação. Output exclusivo docs/learner-downloads/catalogo-preview/\*\*: HTMLlocal acessível + equivalente textual. UXprodutor → CDreviewerconteúdo → SystemDesignerapprovervisual, antes da admissão. Dedupnativa20:54 por "catalogo-preview" zeroresultados, repoleituraindependente nãoencontrou equivalente.



Fontesaceitas: U09 PR643@32888d9f03006f3dbcdaa57811b29c54a2c09146; U10PR646@f7e3228a80cecc68e426e7d59d080a234d249104; U13PR645@b028652d7853cbd4efdf15035d9f9414aeb76094; folhaCotidianoPR644@fb8b4fe7e1a1cfe21708197761ef54987a0c95d9. Reusar identidadevisualSDLCQuest PR614@7c72a4a1b6bc8fb63366fbc5b204479e7d915944, semdesignsystemnovo. Inspecione fontes/pinsreais antes de produzir; preservar textos/conteúdo dospacotesaceitos.



Objetivo: aprendiz consegue escolher atividade por resultado, duração real, requisitos, passosiniciais e disponibilidadeVERDADEIRA. U09prereqU03ouequivalente; U10prereqU07ouequivalente, nãoU09; U13offline/sintético/hheldoutemestágios; cotidiano folha de exercício, não jogo publicado. Kits emprodução3665U09,3668U10,3667U13 e3666PDF; não criar seus equivalentes. Linksrelativos reais só depois doskitsACEITOS/existentes: enquantoisso apresentar indisponível/em preparação sem fakeplay/download ou rota pública inventada. Preview podeficarprontocomoestrutura, integraçãoQAuma vezquando houverpacotesreais.



Provar navegação teclado, foco visível/ordem coerente, semanticHTML/textoequivalente, legibilidade e nãooverflow em320/375/1280. Capturasreais dessesviewports, conferirfunçõesemestadoindisponível; sem alegar dispositivo/leitorfísico nãotestado. Evitar gabarito/answerpreload, claims de eficácia/nota/mastery. Fonteaceitaintacta; changesapenasnovopreview.



Worktreeisolada, basePRdeclarada limpa sobre main preferida ou stackexplicitamentejustificada; fonteporpins, diffeffectivePRinteiro semherançaalheia. DraftPRsomente, Provenanceprópria real, anexos/readbackanteshandoff. Semsitepublicado/deploy/merge/CI manual, sem runtime/catálogo/bindings/permssões/model/credencial/instalação. Stopboundarynegado sematoralternativo.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3669 — Apresentar práticas disponíveis ao aprendiz
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: 1ea53c1b-a0df-47d4-9f84-a86b7c1cd669
- Agent: UX Designer (opencode_local)

## Objective

Entrega nova de entrada para o aprendiz aprovada pelo PO, apenas PREVIEW LOCAL, não publicação. Output exclusivo docs/learner-downloads/catalogo-preview/\*\*: HTMLlocal acessível + equivalente textual. UXprodutor → CDreviewerconteúdo → SystemDesignerapprovervisual, antes da admissão. Dedupnativa20:54 por "catalogo-preview" zeroresultados, repoleituraindependente nãoencontrou equivalente.



Fontesaceitas: U09 PR643@32888d9f03006f3dbcdaa57811b29c54a2c09146; U10PR646@f7e3228a80cecc68e426e7d59d080a234d249104; U13PR645@b028652d7853cbd4efdf15035d9f9414aeb76094; folhaCotidianoPR644@fb8b4fe7e1a1cfe21708197761ef54987a0c95d9. Reusar identidadevisualSDLCQuest PR614@7c72a4a1b6bc8fb63366fbc5b204479e7d915944, semdesignsystemnovo. Inspecione fontes/pinsreais antes de produzir; preservar textos/conteúdo dospacotesaceitos.



Objetivo: aprendiz consegue escolher atividade por resultado, duração real, requisitos, passosiniciais e disponibilidadeVERDADEIRA. U09prereqU03ouequivalente; U10prereqU07ouequivalente, nãoU09; U13offline/sintético/hheldoutemestágios; cotidiano folha de exercício, não jogo publicado. Kits emprodução3665U09,3668U10,3667U13 e3666PDF; não criar seus equivalen
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `1ea53c1b-a0df-47d4-9f84-a86b7c1cd669` finished with status `failed` at 2026-10-18T11:09:19.553Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `.github/workflows/countersign-gate.yml`

## Commands Run

- Heartbeat run `1ea53c1b-a0df-47d4-9f84-a86b7c1cd669` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (6)

**founder** · 2026-10-01T21:04:26.524189+00:00

PO — prioridade atual explícita de Dani: testar a aplicação com24lentes e só mergear se tudoOK. Faça checkpoint imediato deste preview3669: preserve arquivos/WIP/capturas/branch/head e resultados; suspenda buildnovo após pontosseguro, sem apagar/resetar/fecharPR ou descartar trabalho. Nenhum push/publicação extra até preflight de efeitosautomáticos; nenhum produto incompleto entra noRC. Não declare reviewaceito antes deCD/SystemDesigner.



Sua lenteUX da rodadaQA será responsivo/hierarquia/estadosdeerro sobre o candidatoúnico congelado peloFPE/SM; pode preparar casos distintos, mas finalaceite deve nomearmesmoRC. Aguarde manifest e cenários; não testar branchpreviewisolada como se fosseaplicaçãointegrada. Registre checkpoint e disponibilidade nestaissue, mantendoowner/reviewchain. Nova prioridade será entregue por interrupção nativa autorizada, preservando trabalho. [@UX Designer](agent://0bfa47c1-099a-42a1-99a5-7d7b0a380ba9)

**UX Designer** · 2026-10-01T21:09:38.865645+00:00

**Checkpoint preview3669 registrado** (ordem do PO 21:04Z — Dani: testar com as lentes combinadas, só mergear se tudo OK).

**Estado congelado em ponto seguro** — nada apagado, resetado ou descartado:
- Branch `aid3669/catalogo-preview` @ `6ec3eedae32b5c735d3eb532ceadf5e6200614b7` (base declarada `main` = `86fca779`); worktree `/tmp/opencode/wt-aid3669` **limpa** (zero WIP não commitado). Diff efetivo = apenas `docs/learner-downloads/catalogo-preview/` (3 arquivos, 391 linhas).
- **Draft PR #651 aberto e intacto** (não fechado, não promovido, sem merge).
- Último push = `6ec3eeda`, anterior à ordem; **nenhum push/publicação extra daqui em diante** até o preflight de efeitos automáticos. Build novo suspenso; nenhum produto incompleto entra no RC.

**Resultados preservados** (verificação real, headless, sem alegar dispositivo/leitor físico):
- `verification.json`: 320/375/1280 sem overflow (offenders 0); skip link primeiro no Tab e visível, foco 3px `#12624c`; semântica pt-BR com `header/main/footer`, 1×`h1` + 4×`h2`, 12 `dl` + 12 passos `ol`; 4 botões "em preparação" `disabled` nativos e inertes mesmo sob forced click; **axe = 0 violações**.
- Capturas reais: `catalogo_320.png`, `catalogo_375.png`, `catalogo_1280.png`.
- Preservação em dois caminhos: (a) anexos neste issue (arquivos brutos 21:04Z + **zip consolidado do checkpoint** — attachment `e5ce1b89-9b20-4966-a17a-8ef937c64077`, com snapshot byte-a-byte `@6ec3eeda` e SHA-256); (b) workspace `/paperclip/aid3669-evidence/`.
- Nota de precisão: o README do preview afirmava "verificação registrada no issue" — os artefatos eram reais desde 21:04Z, mas o registro faltava; **este comentário é esse registro**.

**Disponibilidade para a rodada QA — lente UX (responsivo / hierarquia / estados de erro):**
- Casos distintos já preparados: `qa-3669-casos-lente-ux.md` (attachment `95f2b8d4-71d0-4f3d-b62a-ebedcf3c571e`; work product `7f326793-b189-4448-95aa-42386c56cbae`) — 6 responsivo, 5 hierarquia, 8 estados de erro/indisponibilidade, incluindo disponibilidade VERDADEIRA integrada e paridade visual↔texto.
- Executarei **somente sobre o candidato único congelado pelo FPE/SM nomeado no manifest, na aplicação integrada** — não testarei a branch de preview isolada como se fosse a aplicação integrada. O aceite final desta lente **nomeará o mesmo RC**.
- **Aguardando manifest + cenários** (nova prioridade via interrupção nativa autorizada).

**Cadeia owner/review mantida:** UX produtor (eu) — produção congelada em checkpoint; CD (revisão de conteúdo) pendente; SystemDesigner (aceite visual) pendente; **nenhum review aceito declarado antes de CD/SystemDesigner**. Issue em `todo` como descanso time-gated até o manifest/cenários da rodada QA.

**founder** · 2026-10-17T16:15:44.86186+00:00

🚀 Prioridade alta após o merge da onda #657 (`b08e0096`) na `main`: especificar e validar a apresentação clara das práticas disponíveis (`pg-c01`, `pg-d01`..`pg-d04`) ao aprendiz.

**founder** · 2026-10-17T16:18:15.670543+00:00

🚀 Prioridade alta após o merge da onda #657 (`b08e0096`) na `main`: especificar e validar a apresentação clara das práticas disponíveis (`pg-c01`, `pg-d01`..`pg-d04`) ao aprendiz.

**?** · 2026-10-17T16:40:09.785734+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `process_lost` - Process lost -- server may have restarted. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `571ec34d-682f-4a55-af42-e5f67155053a`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:50.293599+00:00

PR #702 aberto (catálogo v2 com 8 práticas disponíveis).

---

