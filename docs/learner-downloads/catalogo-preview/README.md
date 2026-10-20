# Catálogo de práticas (preview local) — AID-3669

Diretório de documentação de projeto. Entrega nova de entrada para o aprendiz aprovada pelo PO:
**apenas PREVIEW LOCAL, não publicação**. Artefato **fora do currículo canônico**: não altera
lições, gates, bindings, IDs, progresso, dominância, engines ou runtime.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `catalogo-visual.html` | Catálogo visual em arquivo único, offline, responsivo (mobile-first ≥320 px). **Material do aprendiz.** |
| `catalogo-texto.md` | Equivalente em texto puro (leitores de tela, baixa banda, P&B). Mesmas práticas e informações. |
| `README.md` | Este arquivo: uso, decisões, nota técnica (procedência/pins/fronteiras). |

## Como usar

1. Abrir `catalogo-visual.html` em qualquer navegador (sem dependências externas, sem JS, sem rede);
   para acessibilidade/baixa banda, usar `catalogo-texto.md`.
2. O objetivo de escolha: o aprendiz escolhe atividade por **resultado, duração real, requisitos,
   primeiros passos e disponibilidade VERDADEIRA**.
3. Disponibilidade verdadeira nesta versão (incremento 2026-10-17): **as oito práticas estão
   disponíveis** — os botões são links reais e relativos ao repositório: ZIPs dos kits offline
   (`../pg-d04-contexto-e-spec/zips/…`, `../pg-d05-delegacao-controlada/zips/…`,
   `../pg-e01-evals-offline/zips/…`), enunciados dos pacotes de currículo
   (`../../curriculum/…`) e a folha pronta (`../worksheets/reparo-de-rotina/worksheet-visual.html`).
   Nenhum link falso, download simulado ou rota inventada.

## Práticas listadas e fontes (pins inspecionados antes da autoria — 2026-10-01 e 2026-10-17)

| Prática | Fonte aceita (pin) | Disponibilidade verificada em `main` |
| --- | --- | --- |
| PG-C01 dados mínimos e verificação (cotidiano) | pacote aprovado AID-3565 → AID-3573 @ `88ca305e` | `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/` |
| U06 pg-d01 reproduza antes de perguntar | AID-3510 sequência Dev guiada @ `e01d9d42` (merge PR #673 @ `42386f5d`) | `curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/` |
| U03 pg-d02 pedido de 5 campos | AID-3553 PR #631 @ `f6411e31` (errata `4cabf984`) | `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/` |
| U07 pg-d03 refatoração com rede | AID-3562 @ `353aec42` | `curriculum/sequencia-dev-guiada/pg-d03-refatorar-com-rede/` |
| U09 pg-d04 contexto + PRD/SPEC | fonte PR #643 @ `32888d9f`; kit AID-3665 @ `e001e548` | `docs/learner-downloads/pg-d04-contexto-e-spec/` (ZIP) + pacote |
| U10 pg-d05 delegação controlada | fonte PR #646 @ `f7e3228a`; kit AID-3668 @ `87d6441f` (byte-idêntico, 18/18 hashes) | `docs/learner-downloads/pg-d05-delegacao-controlada/` (2 ZIPs) + pacote |
| U13 pg-e01 evals offline | fonte PR #645 @ `b028652d`; kit AID-3667 @ `3b17ebaf` (byte-idêntico, 28/28 hashes) | `docs/learner-downloads/pg-e01-evals-offline/` (5 ZIPs) + pacote |
| Cotidiano — folha “reparo de rotina” | PR #644 @ `fb8b4fe7` (r2 PO/CD) | `docs/worksheets/reparo-de-rotina/` |

Pré-requisitos declarados conforme as fontes: pg-c01 ancorado em l09–l12, l20 e l25; pg-d01 exige
l16 e l21; pg-d02 exige l16; pg-d03 exige l21 e pg-d01; U09 (pg-d04) exige U03 (ou equivalente);
U10 (pg-d05) exige U07 (pg-d03) (ou equivalente) e **não** exige U09; U13 (pg-e01) exige U05
(pg-d01 ajuda, não é obrigatória); a folha cotidiana aplica-se após l30 → l32 e é folha de
exercício, não jogo publicado. U13 é apresentada como offline / sintética / held-out em etapas;
os kits pg-d05 (2 etapas) e pg-e01 (5 etapas) preservam essas fronteiras por desenho. Textos e
conteúdo dos pacotes aceitos preservados (nenhum gabarito, resposta ou preload de solução no
caminho do aprendiz; sem claims de eficácia/nota/mastery). Duração de pg-c01: o pacote não fixa
tempo — o catálogo declara “uma sessão, no seu ritmo” em vez de inventar número.

## Desenho (decisões registradas)

- **Incremento 2026-10-17 (pós-wave #657):** o catálogo passa de 4 para 8 práticas — entram
  pg-c01 (cotidiano) e pg-d01/pg-d02/pg-d03 (sequência Dev guiada), todas com links reais; as
  quatro cards originais (U09, U10, U13, folha) migram de “em preparação” para “disponível agora”,
  porque os kits offline e a folha r2 estão em `main` (pins na tabela acima). Nenhum conteúdo de
  exercício foi reautorado: a copy do catálogo resume os pacotes aceitos; os links relativos só
  apontam para o que já existe.
- **Identidade visual:** tokens SDLCQuest v1.3 copiados 1:1 (paper/card/ink/muted/line/deep/mint/
  menta-escuro/gold/coral, raios 18/10/9, foco visível 3 px `#12624c` offset 3, corpo ≥14 px/1.75,
  eyebrow/mono 11 px, h1 com `em` em Georgia, seleção menta, reduced-motion zera transições) —
  nenhum sistema visual paralelo. Ajuste de acessibilidade com token existente: texto do chip de
  unidade usa `--muted` `#4c6057` (razão 5,67:1 em `#e9ede3`) em vez do `#557260` da fonte
  (4,46:1, reprovado pelo axe) — cor já pertencente ao conjunto, sem tom novo. Extensão limitada
  documentada: rótulo de trilha (ouro p/ “IA no cotidiano”, menta-escuro p/ “IA para Dev”) e ponto
  ouro p/ status “em preparação” na legenda, ambos com tokens existentes (mesma regra bounded do
  contrato AID-3458).
- **Estrutura integrada (2026-10-17):** o grid de cards, a barra de contagem e a legenda de status
  distinguem “disponível agora” (ponto menta, link real) de “em preparação” (ponto ouro, botão
  inerte). Com os kits e pacotes em `main`, as oito práticas estão no estado menta; o estado ouro
  permanece disponível para futuras práticas sem download.
- **Sem JS:** catálogo estático em HTML semântico; botões indisponíveis são `disabled` nativos
  (não recebem foco por Tab e não disparam nada — verificação registrada no issue).
- **Linguagem simples na copy do aprendiz:** “prática”, “folha de exercício”, “tente novamente”;
  IDs internos (AID-*) e pins ficam apenas nesta nota técnica.
- **Fronteiras honradas:** sem site publicado/deploy/merge/CI manual, sem runtime/catálogo/bindings/
  permissões/modelo/credencial/instalação, sem dados reais (tudo sintético/fictício), nada é salvo
  pelo HTML.

## Nota técnica (procedência e fronteira)

- Aprovado: AID-3669 (PO). Fluxo: UX produtor → revisão de conteúdo do Content Designer → aceite
  visual do System Designer, antes da admissão. Dedup nativa por “catalogo-preview” = zero resultados
  (2026-10-01 20:54) + re-leitura independente sem equivalente; `docs/learner-downloads/` não existe
  na base.
- Base de ramificação declarada: `main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0` (worktree
  isolada; diff efetivo do PR = apenas este diretório novo, sem herança alheia).
- Fontes por pins (imutáveis, somente leitura): PR #643 @ `32888d9f`, PR #646 @ `f7e3228a`,
  PR #645 @ `b028652d`, PR #644 @ `fb8b4fe7`; identidade visual SDLCQuest PR #614 @ `7c72a4a1`
  (contrato `_work-products/AID-3458/fatia1/01-tokens-e-identidade.md`). Nenhuma fonte modificada.
- Verificação registrada no issue (headless Chromium, sem alegar dispositivo/leitor físico não
  testado): navegação por teclado e ordem de foco, foco visível, HTML semântico + equivalente
  textual, legibilidade e não-overflow em 320/375/1280, funções em estado indisponível inertes,
  capturas reais dos três viewports.
- Autoria/execução: UX Designer de Aprendizagem, agente `0bfa47c1-099a-42a1-99a5-7d7b0a380ba9`.
