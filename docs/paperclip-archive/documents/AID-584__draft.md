<!-- issue: AID-584 | key: draft | doc_id: 5744f1ce-d541-4e26-93e1-ab480d88a6f2 | updated: 2026-09-02 05:17:59.14+00 -->

# AID-584 — DRAFT: lição l26 "Confira o que a IA extraiu" (mod-07, onda O2 T3)

(AID-584)

# AID-584 — DRAFT: lição l26 "Confira o que a IA extraiu" (mod-07, onda O2 T3)

**Status:** DRAFT de autoria CD completo — pronto para landing FPE (porta de aceite §6.2 da spec). Zero escrita canônica: nenhum commit/branch/PR; catálogo, bindings e produção intocados (single-writer `main` preservado).
**Owner:** Content Designer (f2b1e95d). ORDEM AID-580 (T3); spec-mãe AID-528 doc `spec` rev 3 `dce5594f` §2.3 (LITERAL) + convenções §2; template/checklist AID-525 §2/§3.1.
**Baseline verificada first-hand:** `origin/main` @ `9bceddb` (pós-merge PR #235 — T0 AID-581 `done`): entrada `l26` `planned` em mod-07 no `catalog.yaml` (moduleId/title/objective/estimatedMinutes/prerequisites/skillIds idênticos ao abaixo); módulo `07-ia-alem-do-texto` ainda sem arquivos (landing é do FPE).
**Arquivo proposto:** `curriculum/ai-literacy/modules/07-ia-alem-do-texto/l26-confira-o-que-a-ia-extraiu.yaml` (slug kebab do título, convenção do catálogo; **139 linhas** — orçamento §3.1.8: 130–150).
**Pré-validação (read-only, em cópia temporária da trilha extraída de `origin/main`; repositório intocado):** `python3 tools/validate.py` verde com o arquivo presente e `l26` flipped `ready` — "OK: 24 lição(ões) ready validadas: 18 IA na Prática, 6 Dev; 2 planned (sem arquivo exigido)".

```yaml
# Lição l26 — Onda O2 (spec AID-528 rev 3 §2.3): conferência de extração de documento anexado.
# Fecha o arco do mod-07 (anexar → pedir → conferir → usar) e estende os sinais da l20
# (número preciso, data, citação nominal) para a extração de anexo.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l26
version: 1
moduleId: mod-07
title: "Confira o que a IA extraiu"
objective: "Diante de uma extração feita de um documento anexado, conferir os campos críticos contra o trecho original e corrigir divergências antes de usar a saída."
estimatedMinutes: 4
skillIds: [avaliar, aplicar]
prerequisites: [l20]

activities:
  - id: l26-a1
    type: output_comparison
    skillId: avaliar
    instruction: "VOCÊ ANEXOU A ATA DA REUNIÃO E PEDIU UM RESUMO PARA A DIRETORIA. COMPARE AS DUAS SAÍDAS E ESCOLHA A MELHOR PARA USAR."
    data:
      scenario: "Você anexou a ata da reunião e pediu um resumo para a diretoria. Trecho visível da ata: 'orçamento aprovado: R$ 48.500 · prazo: 15 de março · responsável: equipe de suporte'. Na sua ferramenta real você anexaria o arquivo; aqui você decide por controles rotulados."
      outputs:
        - id: out-a
          text: "Resumo para a diretoria: orçamento aprovado de R$ 48.500, prazo em 15 de março, responsável: equipe de suporte — valores conferidos na ata."
        - id: out-b
          text: "Resumo para a diretoria: orçamento na casa de cinquenta mil, prazo para meados de março, e a equipe cuida do resto."
      criteria:
        - id: c-preserva-valores-exatos
          text: "Preserva os valores exatos do trecho original (R$ 48.500 · 15 de março · equipe de suporte)"
        - id: c-cita-a-origem
          text: "Marca de onde os valores vieram (a ata)"
        - id: c-sem-invencao
          text: "Não arredonda, não troca e não inventa valores"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-preserva-valores-exatos, c-sem-invencao]
    feedback:
      onFailure: "Extração que arredonda ou troca números sem marcar a origem não vai para a diretoria. A saída A mantém os três valores do trecho e avisa que foram conferidos na ata; a B troca R$ 48.500 por 'cinquenta mil', vaga o prazo para 'meados de março' e não cita origem nenhuma."
      perCheck:
        betterOutputId: "A saída A é a única que mantém valor, data e responsável exatamente como estão na ata — e marca a origem."
        c-preserva-valores-exatos: "Faltou este critério: 'na casa de cinquenta mil' e 'meados de março' não são os valores da ata — extração se confere campo a campo."
        c-sem-invencao: "Faltou este critério: arredondar e trocar números numa extração é o mesmo que inventar — o trecho diz R$ 48.500 e 15 de março."
      onSuccess: "Exato! Extração pronta para usar: valores idênticos ao trecho original e origem marcada — a diretoria recebe o que a ata diz."
    storage:
      policy: structured_only
    hints:
      - "O que acontece com a decisão da diretoria se o valor chegar trocado ou arredondado?"
      - "Compare campo a campo com o trecho da ata: qual saída mantém R$ 48.500, 15 de março e equipe de suporte — e diz de onde vieram?"

  - id: l26-a2
    type: choice
    skillId: avaliar
    instruction: "A IA EXTRAIU ESTES CAMPOS DA ATA. QUAIS VOCÊ CONFERE NO DOCUMENTO ORIGINAL ANTES DE USAR?"
    data:
      multiSelect: true
      options:
        - id: opt-valor
          text: "Valor aprovado: R$ 48.500"
        - id: opt-data
          text: "Data do prazo: 15 de março"
        - id: opt-responsavel
          text: "Responsável: equipe de suporte"
        - id: opt-paginas
          text: "A ata tem 3 páginas"
        - id: opt-tom
          text: "O texto da ata está formal"
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-valor, opt-data, opt-responsavel]
    feedback:
      onFailure: "O sinal é o mesmo da verificação de números e fatos, agora no anexo: número preciso, data e citação nominal são campos que a IA pode trocar ao extrair — confira cada um contra o trecho original antes de usar. Quantidade de páginas e tom do texto não mudam a decisão."
      perCheck:
        opt-valor: "Confira: número exato é o campo que mais se troca na extração — R$ 48.500, não 'cinquenta mil'."
        opt-data: "Confira: data vira 'meados de março' com facilidade — o prazo é 15 de março."
        opt-responsavel: "Confira: citação nominal define quem responde pela entrega — equipe de suporte."
        opt-paginas: "Não precisa conferir: o número de páginas não muda nenhuma decisão."
        opt-tom: "Não precisa conferir: o tom do texto é descrição, não dado extraído."
      onSuccess: "Isso! Número preciso, data e nome são os campos que exigem conferência — página e tom são detalhe do documento, não dado."
    storage:
      policy: structured_only
    hints:
      - "Quais campos, se chegarem trocados, mudam a decisão de quem lê o resumo?"
      - "Número exato, data e nome próprio são os sinais de sempre — o resto é descrição do documento."

  - id: l26-a3
    type: sort
    skillId: aplicar
    instruction: "DO DOCUMENTO ANEXADO ATÉ O USO. ORDENE O FLUXO DE TRABALHO COMPLETO."
    data:
      items:
        - id: passo-proteger-anexo
          text: "Conferir se o anexo é seguro e remover o que a tarefa não usa"
        - id: passo-anexar-e-pedir
          text: "Anexar o documento e escrever o pedido com tarefa, referência e formato"
        - id: passo-comparar-campos
          text: "Comparar cada campo extraído com o trecho original"
        - id: passo-corrigir-e-usar
          text: "Corrigir a divergência no pedido e só então usar a saída"
    evaluation:
      strategy: deterministic
      expectedOrder: [passo-proteger-anexo, passo-anexar-e-pedir, passo-comparar-campos, passo-corrigir-e-usar]
    feedback:
      onFailure: "A ordem é: conferir a segurança do anexo, anexar e pedir, comparar os campos extraídos com o trecho, corrigir e usar. A proteção vem antes de o arquivo sair; a comparação vem depois da resposta; a correção vem antes do uso."
      perCheck:
        passo-proteger-anexo: "Primeiro: remover o que expõe pessoas e o que a tarefa não usa — o arquivo não sai antes disso."
        passo-anexar-e-pedir: "Segundo: anexo sem instrução gera resposta genérica — o pedido com tarefa, referência e formato vai junto."
        passo-comparar-campos: "Terceiro: só existe o que comparar depois que a resposta chega — campo a campo contra o trecho."
        passo-corrigir-e-usar: "Quarto: a divergência se corrige no pedido, e a saída só se usa depois de corrigida."
      onSuccess: "Fechado: proteger → anexar e pedir → conferir → corrigir e usar. Esse é o mapa mental do módulo inteiro."
    storage:
      policy: structured_only
    hints:
      - "O que precisa estar resolvido antes de o arquivo sair do seu computador?"
      - "Proteger vem antes de anexar; conferir vem depois da resposta; corrigir vem antes de usar."

rubric:
  id: l26-rubric
  criteria:
    - id: r-confere-campos-criticos
      text: "Sabe quais campos exigem conferência pelo sinal: número preciso, data e citação nominal."
      weight: 1
    - id: r-verifica-contra-o-original
      text: "Compara os campos extraídos contra o trecho original, não contra a memória."
      weight: 1
    - id: r-fecha-o-fluxo-com-correcao
      text: "Corrige a divergência no pedido antes de usar a saída."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l26-a1, l26-a2, l26-a3]
```

---

## Notas de autoria (decisões dentro do spec; desvios: nenhum)

1. **skillId por atividade:** a1/a2 = `avaliar`, a3 = `aplicar` (spec fixa `skillIds: [avaliar, aplicar]` da lição; progressão avaliar→aplicar, com a3 fechando o fluxo de uso do módulo).
2. **perCheck além do exigido:** spec pede `perCheck` em a1 (padrão l15-a2/l18-a2 — respeitado: keys = `betterOutputId` + `requiredCriterionIds`, como em l18-a2); estendi a a2 (por opção) e a3 (por item) porque o template §2.1 do readiness prevê perCheck por campo/critério/opção e o loop feedback determinístico é a lição AID-448 — dentro do orçamento de linhas.
3. **a1 saída B:** "e a equipe cuida do resto" materializa a omissão do responsável (spec: resume "orçamento na casa de cinquenta mil", "prazo para meados de março", sem citar origem) sem inventar valor novo.
4. **Copy honesta R1** no `scenario` de a1 (literal da convenção §2: "na sua ferramenta real você anexaria o arquivo; aqui você decide por controles rotulados"); trecho concreto da ata visível no cenário (R1/R2).
5. **Vendor-neutral (R4) e zero vocabulário novo (R5):** nenhum produto/ferramenta citado; só palavras cotidianas (anexar, extrair, conferir, corrigir).
6. **Binding OS (execução FPE, §2.3 da spec):** `chapterOrder: 20`, prereq `[l20]`, `unitId: ai-literacy:l26`, fallback DOM "Compare a extracao da IA com o documento original e corrija antes de usar por controles rotulados." — demais campos conforme spec. **NÃO bumpar `tracks[ai-pratica].contentVersion` aqui** (bump único no primeiro binding da onda, T1/l24).
