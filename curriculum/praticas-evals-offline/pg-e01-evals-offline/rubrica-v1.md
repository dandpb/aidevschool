# pg-e01 — Rubrica de avaliacao v1 (objetiva; mesma forma das praticas pg-d01/pg-d03/tp-*)

Veredito por criterio: `met` | `partial` | `not_met` — sempre com evidencia
(comando/saida/hash citado). Sem nota agregada: a pratica e concluida com
os 6 criterios `met` ou `partial` justificado. A rubrica avalia **a
execucao do ciclo de avaliacao**, nao a elegancia da prosa da proposta.

| # | Criterio | Pergunta de verificacao (perCheck) |
| --- | --- | --- |
| c-criterios-antes | Criterios (metrica, fatias minimas, regra de decisao com limiares, particoes, tratamento de evidencia do proponente) registrados por escrito e congelados com `sha256sum` ANTES de abrir qualquer `saidas_*.json` | O log mostra o hash de `meus-criterios.md` anterior a primeira execucao do scorer — e o mesmo hash re-verificado ao fim? Mudou algo nos criterios depois de ver saidas? (mudou = `not_met`: criterio ajustado apos ver a resposta e racionalizacao) |
| c-fatia | O diagnostico cita a fatia que piorou com n e delta, extraido do scorer (nao de impressionismo), e a mecanica do prompt que causa o erro | A saida real de `metricas.py comparar` no base esta registrada com a linha da fatia regredida? O texto liga o erro a um trecho especifico do `prompt_v2.md`? |
| c-media-enganosa | A analise explica POR QUE o agregado melhor/igual escondia a regressao (qual fatia pagou a melhora da outra), com numeros | O texto mostra a decomposicao (ex.: +2 acertos em X pagando −2 em Y) em vez de so repetir "a media engana"? Aponta o veredito `FLAG_REGRESSAO_ESCONDIDA=1`? |
| c-proposta | Correcao de prompt v2.1 escrita como diff exato do trecho a mudar, com por-que (mecanica), o que preservar e risco declarado; registrada com hash ANTES de abrir o heldout | Existe `proposta-v2.1.md` (ou equivalente) com o diff e o hash registrado antes do primeiro comando sobre `heldout/`? A proposta ataca a causa diagnosticada sem reescrever o prompt inteiro? |
| c-heldout | Heldout aberto somente apos a proposta registrada; mesma metrica congelada; diagnostico testado em casos NOVOS (A vs B) e correcao verificada (B vs C), com saidas reais | O log mostra a ordem (hash da proposta → comandos heldout)? As saidas citam os numeros do heldout (fatia regredida reproduzida; C recupera sem derrubar outras)? Uso de casos do heldout para retocar criterios/proposta = vazamento = `not_met` |
| c-independencia | A alegacao da autora do v2 foi tratada como entrada (nao como verificacao); o veredito cita so o scorer proprio; a entrega declara o que NAO esta provado (sintetico, n pequeno, prova real exige pipeline + verificacao independente) | O relato final separa "o que o scorer mostrou" de "o que a proponente alegou"? Ha uma frase explicita de limite (sem eficacia real alegada; evidencia do produtor nao substitui verificacao)? |

## Mapeamento dos criterios negativos (o que reprova por definicao)

- **Media esconde regressao de slice** → reprova `c-fatia`/`c-media-enganosa`.
- **Vazamento treino→heldout** (heldout aberto cedo ou usado para retocar
  criterio/proposta) → reprova `c-heldout`.
- **Criterio ajustado apos ver a resposta** (hash divergente) → reprova
  `c-criterios-antes`.
- **Evidencia do produtor apresentada como verificacao independente**
  (veredito baseado no relato da proponente ou nas saidas "C" tratadas
  como prova da SUA correcao) → reprova `c-independencia`.

## Notas de aplicacao

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a pratica **inconclusa** (nao "reprovada" — ver
  enunciado §Retry).
- A rubrica nao mede tempo nem estilo de escrita; duracao e guia de
  cadencia.
- Evidencia textual (comandos+saidas+hashes) basta; nao ha captura de
  tela.
- v1 — revisoes futuras versionam este arquivo (v2, v3) sem editar a v1,
  mesmo padrao de `curriculum/praticas-transferencia/`.
