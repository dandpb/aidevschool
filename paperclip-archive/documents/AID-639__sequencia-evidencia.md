<!-- issue: AID-639 | key: sequencia-evidencia | doc_id: 66bb354b-ed2f-490b-bffa-a97834e6cf18 | updated: 2026-09-02 13:19:34.803+00 -->

# AID-639 — Doc 3/3: Recomendação preliminar de sequência de evidência — próximas 2 janelas (moderado ∥ ativação OP-B → pacote l30+)

(AID-639)

# AID-639 — Doc 3/3: Recomendação preliminar de sequência de evidência — próximas 2 janelas

**Status:** RECOMENDAÇÃO (preliminar; propriedade UX; não é decisão de produção). Zero escrita canônica.
**Owner:** UX Designer de Aprendizagem (0bfa47c1). Mandato: AID-639 (entrega 3). Insumos: Doc 1 `teste-moderado-o1` + Doc 2 `funil-op-b` + registros AID-610 §8 (eficácia/l30+ = UX com evidência de coorte/funil; analytics ≠ evidência), AID-558 §6 (O3-C1 candidata natural "após o funil existir"), β "retomar conversa técnica" [l16] preservada na rev `7c3f9456` para l30+, dev com 3 janelas consecutivas e demanda não medida.

---

## 1. Princípio norteador

Nenhum instrumento sozinho responde l30+. Cada um prova uma coisa diferente (tabela epistêmica abaixo) — a sequência existe para que, no momento da decisão, haja **dois eixos cobertos: resultado de aprendizagem (moderado) e comportamento agregado (funil)**. O que a casa já decidiu continua de pé: gates intocados, produtor ≠ verificador, sem mecânica de engajamento antes de baseline, sem `mastered`.

| Instrumento | Prova | NÃO prova | Latência |
| --- | --- | --- | --- |
| Teste moderado O1 (Doc 1) | Conclusão sem quebra de expectativa + **transferência imediata** do comportamento em n=5–8 devs | Demanda relativa, retenção, eficácia populacional | ~2 semanas pós-QA GO |
| QA AID-631 (em andamento) | Integridade/a11y formal da onda | Aprendizagem | dias |
| Funil OP-B (Doc 2) | Demanda por trilha, conclusão por missão, retorno D+1/7/21 agregados | Aprendizagem (analytics ≠ evidência) | primeira leitura A+21 após ativação |
| Coorte estilo AID-180 | Loop ponta-a-ponta com pessoas reais (n pequeno) | Poder estatístico (nulo em n=2) | semanas |

## 2. Janela A (agora → ~2 semanas): instrumentos no ar

1. **QA GO AID-631** (dona: QA Lead) — pré-condição do moderado; já em andamento.
2. **Executar o teste moderado l27–l29** (Doc 1; issue filha criada; recruta via rede do founder + comunidades; conclusão ≤2 semanas pós-GO). Produto: síntese anonimizada por cotas (i)–(iii) + tripwire por lição.
3. **Pedir decisão do board sobre ativação OP-B** (Doc 2 §3 é o checklist de ativação; ADR-0010 exige o retorno ao board; anexo de copy já redigido). **Unblock owner: CEO/founder.** Cada semana sem ativação empurra a primeira leitura de funil 1:1 — a ativação é o único item de caminho crítico do eixo agregado.
4. **Leituras baratas embutidas no moderado** (sem custo adicional): expectativa pós-l29 ("porta de entrada" — pós-entrevista D.2), navegação ao módulo com 9 lições (flag RD6), primeira impressão do `rubric_review` dev.
5. **Inventário de dívida de conteúdo para l30+** (desk, sem produção): candidata β preservada; lacunas restantes da trilha dev; semelhança/eco com l19/l16 (o CD já apontou reuso do padrão 3×); promessa interna da trilha ia_pratica (padrão "lacuna única" AID-524 §3.1).

## 3. Janela B (~3–5 semanas): primeira leitura e o pacote de decisão l30+

1. **Primeira leitura de funil A+21** (se ativado na janela A): split dev×ia-pratica, conclusão l27/l28/l29 (capítulos 14–16), friction l27-a2/l28-a2/l29-a2, R1/R7 baseline, retorno por revisão.
2. **Pacote de decisão l30+** (UX publica; decisão é do board, padrão AID-558 §7.1): combina (a) cotas do moderado (aprendizagem), (b) split/conclusão do funil (demanda), (c) inventário de dívida (janela A.5), (d) tripwires vigentes (retrabalho da onda; mediana de módulos AID-524 §5.5). Opções esperadas: nova onda dev (β ou lacuna), onda ia_pratica, ou **O3-C1** (consolidação) — O3-C1 segue exigindo o ruling de migração (des-completar lições, `progress.ts:357–372`) como porta pré-T0, independente do funil.
3. **Fallback declarado (funil escuro):** se o board não ativar OP-B, a priorização de l30+ prossegue com evidência direcional (moderado + coorte pequena) e a limitação epistêmica vai escrita no pacote de decisão; sem inventar proxy de analytics ad-hoc (respeita ADR-0009 e analytics ≠ evidência).

## 4. Recomendação sumária (uma linha por decisão)

- **Moderado:** executar assim que AID-631 der GO — é o único instrumento de aprendizagem existente e o mais barato.
- **OP-B:** ativar na janela A (decisão board; backing durável + env var + copy são as únicas tarefas reais) — sem isso, l30+ decide às cegas no eixo agregado, pela 4ª janela dev consecutiva.
- **Sequência:** moderado (agora) ∥ ativação (agora) → leitura A+21 → pacote l30+ → só então escolher O3-C1 vs nova onda; engajamento só depois do baseline (regra de ouro).
- **Não muda:** gates, contrato de conteúdo (regra 7), ADR-0009, produtor ≠ verificador, uma trilha compartilhada/muitos motores.

## 5. Trade-offs honestos

- Moderado com n=5–8 pode não capturar fricções raras (tipo AID-448) — o funil cobre a cauda longa; por isso os dois eixos.
- Ativar OP-B adiciona 1 superfície operacional (backing, prune, drift) — custo pequeno e contratado no ADR-0010; não ativar mantém o risco estratégico #1 do draft AID-447 (eficácia/engajamento imensuráveis).
- Executar moderado antes do QA GO economizaria dias mas testaria em superfície sem veredito — rejeitado (produtor ≠ verificador).
