# dojoToday

A **lição de hoje do programador** no DevSchool — uma superfície só-leitura que
consome o substrato compartilhado (FSRS + streak + gate executável) e mostra, numa
pegada Duolingo com voxel art: a sequência atual, as revisões vencidas (agendadas
por FSRS a partir dos gates) e a unidade ativa.

> Público: **programadores**. O MVP para pessoas não técnicas vive em
> [`../literacyDojo/`](../literacyDojo/). A visão de dois públicos está em
> [`docs/VISION.md`](../../docs/VISION.md).

## O que ele é (e não é)

- **É** uma landing "abra e veja sua lição de hoje" — a cola que faltava entre o
  scheduler FSRS já construído e os jogos voxel.
- **Não** agenda, **não** avalia, **não** marca `mastered`. Tudo vem do
  [`learner/`](../../learner/) via `tools/gen-today.py`, que chama o scheduler
  único (`learner.substrate.scheduling`). Regra de ouro do ecossistema: produtor
  ≠ verificador.

## Stack

Vanilla DOM + TypeScript + Vite. **Zero dependências de runtime** (mesmo padrão
do `codexDojo`). O read model `src/data/today.ts` é gerado (DO NOT EDIT).

## Como rodar

```bash
cd engines/dojoToday
npm ci
# Para regenerar a projeção explicitamente, volte à raiz e rode:
# python3 -m learner.substrate
npm run dev         # http://localhost:5180
npm run lint && npm run build
```

Pré-requisito da geração executada por `prebuild`: `python3` com `pyyaml` e
`fsrs` (o mesmo ambiente do substrato — `pip install -e ".[dev]"` na raiz).

## Origem dos dados

`tools/gen-today.py` lê `learner/learning_state.yaml` (fonte da verdade) e chama:

- `scheduling.derive_next_reviews` → fila de revisões devidas (FSRS);
- `scheduling.reconcile_streak` → streak + freezes (cap 2);
- `scheduling.compute_curr` → CURR (proxy não-validado, só exibido).

## Sócrates — assistente opcional com IA

O tutor Sócrates (no card de missão) é **determinístico por padrão**: sem
configuração, ele entrega o nudge "tente primeiro; o verificador independente
avalia" e o app funciona 100% offline, sem conta nem custo (invariante do MVP).

Opcionalmente o aprendiz pode ligar um **tutor socrático real com LLM**
(bring-your-own-key): botão "⚙️ Configurar assistente" → endpoint base
(compatível com OpenAI) + chave API + modelo. Configurado, "Perguntar" chama o
endpoint com um system prompt socrático ancorado na missão e na ética do
learning gate (guiar por perguntas, nunca entregar a solução; o verificador
independente decide).

**Privacidade/segurança:** a chave fica só no `localStorage` deste navegador e é
enviada APENAS ao endpoint configurado. Conversas não são persistidas. O caminho
de evidência (verificador independente) nunca passa por aqui. Recurso
experimental; remova a chave com "Limpar" ou limpando o `localStorage`.

## Jogar inline

A missão ativa pode ser jogada **dentro** do dojoToday (botão "▶ Jogar aqui"), sem
abrir aba/server separado. O jogo voxel ativo é pré-compilado com base relativa
(`vite build --base=./`) e copiado para `public/games/<num>/`; o card carrega esse
bundle num iframe (lazy — só ao abrir).

- Para rebuildar o jogo ativo após mudá-lo no voxelDojo:
  `cd ../voxelDojo/game-02-warehouse && npm run build -- --base=./ && cp -r dist/. ../../dojoToday/public/games/02/`
- v1 inclui só o jogo da missão ativa (02). Generalizar para os 18 (build+embed
  por conceito) é tarefa de infra, não de produto — vive melhor no
  [`../codexdojo-os-prototype/`](../codexdojo-os-prototype/) (que já embeda por URL).

## Fora do escopo (v1)

- Sem linha "pegadinha recorrente" (viria do parser de `learner/pitfalls.md`).
