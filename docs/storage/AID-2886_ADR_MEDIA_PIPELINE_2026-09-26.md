# ADR — Pipeline de mídia das micro-lessons (Git LFS vs object storage S3-compatível + CDN) — AID-2886

**Status:** PROPOSTA — decisão de provisionamento é do founder/CEO (não decidida aqui)
**Data:** 2026-09-26 · **Owner:** Storage Engineer · **Plano aprovado:** AID-2876 rev `f5f4bbc3`, prioridades 4 e 5
**Teto orçamentário:** US$25/mês (`budgetMonthlyCents` 2500) sem aprovação expressa do CEO

---

## Contexto

Mídia binária já é o maior consumidor de peso do repo (medido em `origin/main`
@ `dbb6d02c`, 2026-09-26):

| Medição | Valor |
| --- | --- |
| PNGs rastreados | **619 arquivos, 170 351 692 B (~162 MiB)** |
| — dos quais screenshots de evidência em `docs/product-readiness/` | 456 arquivos, 135 552 668 B (~129,3 MiB) |
| JPGs / SVGs / PPTX | 25 (~2,1 MiB) / 6 (0,3 MiB) / 1 (0,1 MiB) |
| `.git` (pack) | **237 MiB** |
| Site implantado (Netlify) | enxuto — 0 PNGs em caminhos de build (`src/`, `public/`) |

Hoje o custo é zero em dinheiro, mas: cada clone/CI paga 237 MiB; o histórico
cresce monotonicamente com screenshots de evidência; e as micro-lessons de AI
Literacy vão demandar áudio/imagem/vídeo em volume crescente — **estourando o
que é razoável carregar num repo-as-database**. Limites práticos: GitHub
recomenda repo < 1 GiB; Netlify limita deploy a 10 k arquivos (mídia fora do
build não conta, e é assim que deve ficar).

## Forças decisórias

1. Custo previsível e **flat com tráfego** — produto é gratuito, sem conta, e
   qualquer custo por egress cresce com cada novo learner.
2. Repo enxuto: filesystem é fonte da verdade para *referências*; bytes grandes
   vivem fora, endereçados por conteúdo (`media/<sha256>.<ext>`).
3. Sem conta, sem login: mídia servida por CDN pública de leitura — CDN não é
   telemetria nem account wall.
4. Operação com toolchain existente (aws-cli/rclone + sha256) e dentro do
   admin já concedido ao Storage Engineer (object store S3-compatível).

## Opções

### Opção 0 — Status quo (Git puro) — US$0/mês
- Pró: zero custo, zero dependência nova.
- Contra: `.git` cresce sem limite com evidência visual e mídia de lição; clone
  e CI lentos; eventual atrito com limites do GitHub; já estamos a ~24% do
  limite de 1 GiB só com pack.
- **Veredicto:** viável hoje, insustentável com mídia de micro-lessons.

### Opção 1 — Git LFS — US$0 (faixa free) a US$5/mês (data pack)
- GitHub Free: 1 GiB storage LFS + 1 GiB bandwidth/mês; pack adicional
  +50 GiB/+50 GiB por **US$5/mês**.
- Pró: mídia versionada junto do código; PRs mostram apontadores.
- Contra: **não reduz o histórico existente** (237 MiB de PNGs continuam no
  pack — migrar exigiria history rewrite, irreversível, outra ADR); quota de
  bandwidth centralizada na conta GitHub e sujeita a throttling em repo
  público; `git-lfs` não está no toolchain local hoje; todo clone/CI/Netlify
  precisa de credencial LFS configurada.
- **Veredicto:** troca um problema (peso) por outro (quota/credencial) sem
  resolver egress.

### Opção 2 — Cloudflare R2 + CDN — **~US$0,15–1,50/mês** (recomendada)
- Preços de tabela (confirmar no provisionamento): storage **US$0,015/GB-mês**;
  **egress US$0**; ops Classe A US$4,50/milhão, Classe B US$0,36/milhão.
- Cenário 10 GiB de mídia: ~US$0,15/mês de storage + ops desprezíveis →
  **< US$1/mês**; a 100 GiB: ~US$1,50/mês. Custo quase flat com tráfego.
- Pró: egress zero elimina o risco de custo proporcional a learners; admin já
  concedido; API S3-compatível (aws-cli/rclone); lifecycle rules nativas para
  versões órfãs de mídia.
- Contra: dependência externa + gestão de chaves; disciplina de chaves por
  conteúdo para manter imutabilidade (cache/CDN assume URLs estáveis).
- **Veredicto:** melhor relação custo/risco dentro do teto — sobra margem para
  snapshots de estado canônico no mesmo orçamento.

### Opção 3 — AWS S3 + CloudFront — ~US$5/mês na escala de dezenas de GB
- S3 Standard US$0,023/GB-mês; egress ~US$0,09/GB (CloudFront ~US$0,085/GB,
  com isenção mensal inicial — confirmar).
- Pró: ecossistema maduro.
- Contra: **egress cobra por tráfego** — em produto gratuito e viral, é o único
  custo que explode com sucesso; mais peças (IAM, distribuição).
- **Veredicto:** cabe no teto hoje, mas o risco de custo é linear em learners.

### Opção 4 — MinIO self-hosted em VPS — US$5–10/mês
- Pró: custo fixo, sem egress medido, controle total.
- Contra: durabilidade é responsabilidade nossa (sem SLA gerenciado), backup
  manual, ops num time minúsculo; região única.
- **Veredicto:** mais barato de prever, mais caro de operar.

## Recomendação

**Opção 2 (R2 + CDN)**, com o contrato abaixo — a decidir pelo CEO:

1. Bytes de mídia de micro-lessons e **novos** screenshots de evidência vão para
   `media/<sha256>.<ext>` no bucket; o repo mantém `docs/storage/manifests/media-manifest.json`
   (caminho → sha256 → URL) — **o repo continua sendo a fonte da verdade das
   referências**; o bucket é armazém de bytes imutável e content-addressed.
2. Histórico existente NÃO é reescrito nesta ADR (history rewrite é irreversível
   e, se um dia fizer sentido, será ADR própria com custo/risco quantificados).
3. Lifecycle: objetos sem referência no manifest por > 90 dias → expiração
   automática (orphan GC); nenhuma expiração de objeto referenciado.
4. Guardrail: alerta de orçamento em US$10/mês (40% do teto) antes de qualquer
   risco de estouro; gasto acima de US$25/mês exige aprovação prévia do CEO.
5. Migração é incremental: só mídia nova usa o pipeline; nada de big-bang.

## Consequências (se aceita)

- Netlify serve mídia por URL de CDN; build do site permanece enxuto.
- Repo deixa de crescer com binários novos; `.git` congela em ~237 MiB.
- Nova dependência operacional (bucket + chaves) documentada em runbook de
  restore na `docs/storage/` (passo seguinte, com a política de backup de
  `learner/`).
