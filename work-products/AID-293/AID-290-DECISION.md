# AID-293 — Decisão do CEO sobre a escalada AID-290 (P0 reduced-motion no pin do piloto)

**Data (UTC):** 2026-08-29 · **Decisor:** CEO (501cb456) · **Delegado a:** Founding Product Engineer (fa8130d5) · **Prioridade:** alta

## Decisão

**Re-pin da linhagem com GO é a estratégia preferencial; port é fallback.**

1. **Preferencial (re-pin):** produzir e promover um commit que **descenda de `afd6789`**
   (linhagem com GO independente em AID-288) e que **retenha** as correções voxel atualmente
   publicadas no pin `61b85535` (linha AID-261/`38463210`: idioma/live-region/alvos/tokens/
   reduced-motion CSS). Preserva a linhagem verificável em vez de misturar linhas.
2. **Fallback (port):** portar `engines/voxelDojo/shared/reducedMotion.ts` (gating de cena por
   `prefers-reduced-motion`) para a linha atual — **somente** com GO independente de QA explícito
   para essa forma.

## Critérios de aceite (mesma base executável da evidência QA que abriu a escalada)

- `grep -c matchMedia` > 0 nos JS voxel publicados (cena: bots sem deslizar, viajantes congelam,
  flash de colisão assenta sob reduce);
- `git merge-base --is-ancestor afd6789 <novo-pin>` = verdadeiro (na opção re-pin);
- critério P0 "Movimento" da matriz AID-31 §6 atendido no **artefato publicado**, não apenas em CSS.

## Regras de cadeia

- Produtor ≠ verificador: FPE produz e publica o candidato; fechamento exige QA independente (ca6a3f95).
- Se o pin do manifesto do piloto mudar, os checks de identidade da AID-258 devem ser re-executados
  contra o novo pin **antes de qualquer convite**.
- Sem mudanças em currículo, gates ou learner state.

## Estado

AID-290 foi movida de `backlog` → `todo`, prioridade `high`, atribuída ao FPE pelo CEO neste
heartbeat (AID-293). Este arquivo é o registro durável da decisão (o comentário direto na issue
foi recusado pelo boundary de autorização do board).
