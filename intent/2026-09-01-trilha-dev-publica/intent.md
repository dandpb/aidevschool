# Intent — Abrir a Trilha Dev ao público (recorte amplo nas engines)

| Campo | Valor |
| --- | --- |
| Status | `accepted` |
| Autor | Daniel (originador) · rascunho: Chief of Staff |
| Data | 2026-09-01 |
| Repo | `dandpb/aidevschool` |
| Relação | Evolui `docs/VISION.md` e `docs/product-readiness/` (oferta atual ainda esconde a Trilha Dev) |

## Problem

A visão tem dois públicos. Só um está no ar. LiteracyDojo público (`https://aidevschool-literacydojo.netlify.app`) entrega IA na Prática e marca Trilha Dev como “em breve”. O guia do estudante da oferta paga confirma: sem Hub, sem escolha IA Prática vs Dev, caminho único IA Prática l01–l03 e depois três missões 3D.

Isso não é porque as engines Dev não existem. Elas já estão no repo e no OS:

- **codexDojo OS** — desktop no navegador, trilhas, Terminal, Files, mentor local, catálogo de 11 apps, Engine Hub com 9 adapters, smoke remoto para jornadas IA Prática e Dev.
- **voxelDojo** — 16 jogos 3D implementados (WAREHOUSE, WORMHOLE, RELAY STATION, HASH RING, etc.), evidência bruta, renderer acessível.
- **pixelDojo / PixelQuest** — encontro arcade que emite evidência; verificador independente em `learner.gate`.
- **dojoToday** — “lição de hoje” do programador (FSRS, unidade ativa, Sócrates opcional BYOK, embed do jogo ativo).
- **literacyDojo** — já hospedável no OS (missões no-code).
- **miniTown** — exploração Nível 0, explícito fora de avaliação.

O que falta é **oferta pública honestamente Dev**: URL de cliente, CTA no LiteracyDojo, escolha de trilha, e as superfícies de programador que o product-readiness já nomeia — não 18 projetos polyglot novos.

Mentir o catálogo 01–18 como “pronto” seria o erro oposto: só 01 e 02 estão implementados (Node; Go/Rust sem paridade). 03–18 são scaffold de currículo, não produto.

## Proposed outcome

A Trilha Dev deixa de ser “em breve”. O programador, sem conta, entra num **campus público** (CodexDojo OS com URL de cliente) e usa o que as engines já fazem.

### Superfície pública (o recorte)

1. **Entrada.** No LiteracyDojo avulso, Trilha Dev vira CTA real para o OS público (não um rótulo morto). No OS, onboarding oferece **IA Prática** ou **Dev**; quem escolhe Dev não é forçado a refazer l01–l03 como se fosse a única escola.
2. **Desktop OS.** Shell já implementado: launcher, janelas, dock, Modo Aprender, mentor determinístico local, Files, Terminal, mapa de arquitetura. Isso é o host, não um extra.
3. **Trilho Dev guiado.** As três missões hospedadas já previstas em `os-voxel-guided-missions`: WAREHOUSE → WORMHOLE → RELAY STATION. Status do host é `completed` local; nunca `mastered`.
4. **Engine Hub visível.** O Hub deixa de ser só laboratório local. No OS público o aprendiz abre, em origens separadas e sem tokens `VITE_*`:
   - **voxelDojo** — catálogo dos jogos já implementados (16), com evidência bruta rotulada como não verificada.
   - **pixelDojo / PixelQuest** — encontro + evidência para o verificador independente (`pixelquest-evidence-encounter`).
   - **dojoToday** — lição de hoje / fila FSRS (`dojotoday-daily-guidance`), read-only sobre o substrato.
   - **literacyDojo** — loop no-code hospedado, para quem troca de trilha.
5. **Retomar.** Mesmo aparelho / mesmo browser, como `os-returning-learner`. Sem conta, sem sync. Backup local se a superfície já tiver (LiteracyDojo tem JSON; OS precisa do mesmo contrato explícito).
6. **Honestidade.** Cada tela Distingue: jogou / `completed` no host / evidência bruta / verificador independente / `mastered`. Jogos e Hub nunca promovem domínio.

### Fora deste recorte (mesmo que exista no repo)

- Catálogo **01–18 como jornada de código polyglot** (só 01–02 Node; resto scaffold).
- **miniMaxEvolutionEngine, minimaxDojo, openclaw, dashboard codexDojo** como produto web de cliente — são lab de operador (Claude Code, checklist, prompts). Podem aparecer no Hub local como “lab”, não como promise pública.
- **miniTown** como aula ou mastery (fica experimental / explore-only, ou oculto na oferta Dev).
- Conta, sync entre aparelhos, backend, filesystem persistente remoto, mentor LLM obrigatório.
- Qualquer claim de que 16 jogos voxel = 16 unidades `mastered`.

## Affected users and systems

- Aprendiz programador (público novo no offer)
- Aprendiz de IA na Prática (LiteracyDojo avulso e missões hospedadas no OS)
- `engines/codexdojo-os-prototype` (host público + Hub)
- `engines/voxelDojo`, `engines/pixelDojo`, `engines/dojoToday`, `engines/literacyDojo`
- `docs/product-readiness/` (tiers, student-guide, facilitator-guide)
- `learner/` (gate, evidência, substrato) — só como verificador independente, não como backend do site
- Netlify / origens estáticas por engine (Hub exige sites separados)

## Constraints

- Mastery nunca vem do LLM nem do jogo. Producer ≠ verifier.
- Não vender 01–18. Jogos voxel/pixel são attempt surface, não certificação do projeto de currículo.
- Sem conta. Progresso neste browser.
- Superfície pública = URL visitável, não `localhost` nem só draft de QA.
- Hub e cada runtime em origens distintas; sem secret em `VITE_*`.
- Deploy estático: bridge Python local do OS **não** existe na web; o host tem de reportar verificação com honestidade (já é invariante do smoke remoto).
- Product-readiness dos use cases Dev hoje está `stale` — revalidar antes de chamar de customer-ready.
- Sem spec/código até este intent ser aceito.

## Open questions

1. **URL canônica do OS público** — alias Netlify novo, path no mesmo domínio do LiteracyDojo, ou os dois com um funil só.
2. **Hub no offer pago:** todos os 9 adapters, ou só voxel + pixel + dojoToday + literacy (lab de operador escondido).
3. **voxelDojo no público:** só as 3 missões do trilho, ou o catálogo de 16 jogável no Hub desde o dia 1 (com o aviso de evidência não verificada).
4. **dojoToday sem substrato canônico do aluno** (não há conta): mostra uma projeção demo / “unidade sugerida”, ou fica fora até haver estado local equivalente.
5. **miniTown:** oculto, ou visível como experimental.

Hipótese default deste rascunho: OS público + CTA no LiteracyDojo; trilha Dev escolhível; trilho das 3 missões; Hub com voxel (16), PixelQuest, dojoToday (projeção local/demo) e literacy; lab de operador e miniTown fora do CTA.

## Author and status

Daniel é o product owner. Status `accepted` em 2026-09-01 no chat 1:1 (Daniel). Commit em `intent/` pendente (GitHub desconectado).
