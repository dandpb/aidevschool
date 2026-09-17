# Design It Twice — "O estado é uma função" (seam = uma função compartilhada, contrato derivado)

**Restrição:** o caller comum (componente que precisa de learner+streak+settings frescos após uma ação) deve ser **uma linha, zero configuração, tipos derivados automaticamente**. Drift server/client estruturalmente impossível.

**A ideia radical:** não existe "contrato da API" separado do código. O module `game-state` exporta **uma única função** cuja *assinatura TypeScript é o contrato*. O tipo `GameSnapshot` é definido **uma vez** no arquivo da interface; a rota HTTP é um adapter fino que apenas serializa o retorno; o cliente importa o **mesmo tipo**. Não há como o cliente declarar um campo que o servidor não envia — o tipo do cliente **é** `Awaited<ReturnType<typeof snapshot>>`. O bug do `leagueXp` torna-se um erro de compilação, não um "undefined" na UI.

---

## 1. Interface

Um arquivo, `src/lib/game-state/index.ts`, é a seam inteira. É o **único** ponto que caller e teste conhecem.

```ts
// ── src/lib/game-state/index.ts ──────────────────────────────────
// A interface completa do module. Nada mais é público.

/** Relógio injetável — a ÚNICA configuração que existe, e é opcional. */
export interface Clock {
  now(): number; // epoch ms
}

/** Efeitos dignos de nota que aconteceram DURANTE a leitura.
 *  O caller comum ignora; quem quer toast consome. */
export type Notice =
  | { kind: "league-reset"; promoted: boolean; demoted: boolean; oldLeague: string; newLeague: string }
  | { kind: "freeze-used" }
  | { kind: "hearts-regenerated"; from: number; to: number };

export interface GameSnapshot {
  learner: {
    id: string;
    name: string;
    path: "neon-syntax" | "silicon-shrine";
    xp: number;
    gems: number;
    league: string;
    leagueXp: number;              // existe porque o tipo manda — compila ou falha
    leagueMeta: { label: string; color: string; emoji: string; threshold: number };
    nextLeagueThreshold: number | null;
  };
  hearts: { current: number; max: number; regenInMs: number | null }; // null = cheio
  streak: {
    current: number; longest: number; freezes: number;
    touchedToday: boolean; missedDay: boolean;
    weeklyXp: number; weeklyGoal: number;
  };
  settings: { sound: boolean; rain: boolean; reducedMotion: boolean; language: string };
  progress: { completedLessons: number; totalLessons: number };
  /** Esvaziada na próxima snapshot(). Transiente por construção. */
  notices: Notice[];
  /** Relógio do servidor no momento da foto — cliente calcula countdowns contra ele. */
  at: number;
}

/** Erro tipado — o ÚNICO modo de falha da interface. */
export class GameStateUnavailable extends Error {
  readonly kind = "infrastructure";
}

/**
 * A função. É o module inteiro.
 *
 * Invariantes (parte da interface, não da implementação):
 *  1. NUNCA rejeita por razão de domínio. Learner inexistente é criado.
 *     Única rejeição possível: GameStateUnavailable (falha de infra).
 *  2. O retorno é CONSISTENTE: league reset semanal, regen de hearts e
 *     freeze de streak já foram liquidados e persistidos. O caller nunca
 *     vê estado "pela metade" nem precisa saber que efeitos aconteceram.
 *  3. IDEMPOTENTE no estado visível: duas chamadas com o mesmo Clock
 *     retornam o mesmo snapshot (notices da 2ª chamada vêm vazio).
 *  4. Fresca por construção: hearts/streak/league são calculados contra
 *     clock.now() NO MOMENTO da chamada — não há cache para invalidar.
 *
 * Ordering constraints:
 *  - Nenhuma. snapshot() pode ser a primeira coisa chamada no processo.
 *  - Mutações (submitLesson, refillHearts...) NÃO fazem parte deste module,
 *    mas por convenção do repo RETORNAM GameSnapshot — o caller pós-ação
 *    nunca chama snapshot() manualmente (ver §2).
 *
 * Error modes:
 *  - resolve(GameSnapshot)        — sempre, inclusive em "erros de domínio"
 *  - reject(GameStateUnavailable) — somente falha de banco/infra
 *
 * Performance: uma transação SQLite, ~2ms local. Seguro chamar a cada ação.
 */
export declare function snapshot(opts?: { clock?: Clock }): Promise<GameSnapshot>;
```

**Dois adapters na seam, um contrato:**

```ts
// Adapter A — HTTP (rota). OBRIGATORIAMENTE fino: serializa e nada mais.
// src/app/api/state/route.ts
export async function GET() {
  return Response.json(await snapshot()); // ← drift impossível: não há montagem manual
}

// Adapter B — in-process (testes, Server Components, Server Actions).
// src/lib/game-state/local.ts — mesma função, mesmo tipo, sem HTTP.
export { snapshot } from "./core";
```

**Derivada para o cliente** (nenhum tipo redeclarado — `types.ts` perde LearnerState/StreakState/SettingsState):

```ts
// src/components/game/game-state.ts — o lado cliente da seam
import type { GameSnapshot } from "@/lib/game-state";
export type { GameSnapshot, Notice } from "@/lib/game-state";

/** Uma linha, zero config. É o refreshState() do mundo novo. */
export async function refreshGame(): Promise<GameSnapshot> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) throw new GameStateUnavailable("state fetch failed");
  return res.json(); // tipado como GameSnapshot — se o servidor mudar,
                     // quebra na COMPILAÇÃO de quem consumir o campo removido
}
```

---

## 2. Uso

**O caso default — trivial como mandado:**

```ts
// store.ts — refreshState() inteiro vira isto:
refreshGame: async () => {
  const s = await refreshGame();        // ← UMA linha. Sem montar nada.
  set({ snapshot: s, leagueReset: pickReset(s.notices) });
},
```

```tsx
// Qualquer componente, uma linha:
const s = useGame((g) => g.snapshot);   // tipado, completo, fresco

// TopBar — quer hearts + countdown de regen:
const hearts = useGame((g) => g.snapshot?.hearts);
// hearts.current / hearts.max / hearts.regenInMs — countdown derivado de snapshot.at

// Shop — quer gemas:
const gems = useGame((g) => g.snapshot?.learner.gems ?? 0);

// StreakMilestone — quer streak.current:
const streak = useGame((g) => g.snapshot?.streak.current ?? 0);
```

Fatias são **selectors do Zustand sobre o mesmo snapshot**, não endpoints separados. O caller "raro" que só quer uma fatia paga exatamente o mesmo preço do comum — esse é o ponto: o caso comum já é o piso de custo, então fatiar é grátis e client-side.

**O caso raro paga mais — e tudo bem:**

```ts
// Teste de regen de hearts — precisa controlar o relógio (caso raro → custa config):
const snap = await snapshot({ clock: { now: () => T0 + 21 * 60_000 } });
expect(snap.hearts.current).toBe(3);

// Toast de freeze — consome notices em vez de um boolean ad-hoc:
const freeze = snap.notices.find((n) => n.kind === "freeze-used");
```

**Pós-ação (o caller mais comum de todos):** mutações retornam o snapshot — a "atualização após ação" some como conceito separado:

```ts
const { result, state } = await submitLesson(payload); // state: GameSnapshot
set({ snapshot: state });                            // fresco, uma round-trip
```

---

## 3. Atrás da seam

A implementation esconde tudo que hoje vaza para a rota e para os callers:

- **Os três efeitos colaterais da leitura** (`checkAndApplyLeagueReset`, `recomputeHearts`+persist, freeze check) viram um pipeline interno *settle → read*: a snapshot sempre reflete o mundo já liquidado. Callers e testes nunca sabem que houve escrita — exceto via `notices`, que é o canal honesto para "algo aconteceu".
- **A ordem interna** (reset de liga ANTES de computar liga/threshold; regen ANTES de ler hearts) — hoje implícita na rota, amanhã esquecida num segundo consumer.
- **O relógio**: `recomputeHearts` hoje lê `Date.now()` escondido. Na implementation, todas as funções puras recebem `now` explicitamente; o `Clock` default (`{ now: Date.now }`) é aplicado na borda, dentro do module. O relógio mora **na seam interna**, nunca no caller.
- **Defaults de settings**, `leagueMeta`, `nextLeagueThreshold`, contagens de lessons, a janela de 5 min do freeze: tudo detalhe de implementation.
- **O formato do JSON**: a rota não "monta" resposta nenhuma. Teste do module = chamar `snapshot()` com banco em memória e relógio fixo — a interface é a superfície de teste, e o adapter HTTP nem precisa de teste próprio (é uma linha).

---

## 4. Estratégia de dependências

| Dependência | Categoria | Onde fica |
|---|---|---|
| Prisma/SQLite | **local-substitutable** | Atrás da seam, dentro da implementation. Testes usam SQLite em arquivo temporário via o mesmo client Prisma — *replace-don't-layer*: testa-se `snapshot()`, não um repo mockado. |
| game.ts (`recomputeHearts`, `computeStreakState`, `leagueForXp`) | **in-process** | Importadas pela implementation. O `Date.now()` escondido é eliminado: assinaturas passam a receber `now: number` (refactor interno, invisível na interface). |
| league-reset.ts | **in-process** (efeito) | Idem. Vira o primeiro estágio do pipeline settle interno; seu resultado alimenta `notices`. |
| Relógio | **in-process, mas variável** | Única dependência exposta na interface — como `opts.clock` opcional. Default = relógio do sistema (zero config pro caller comum); adapter fake = `{ now: () => T }` nos testes. Um parâmetro opcional, não uma hierarquia de injeção. |
| HTTP/Next.js | **local-substitutable** (transporte) | Adapter A. Fino por contrato: se crescer lógica, está errado. |
| Nenhuma remote-owned / true-external | — | A seam existe porque há **dois adapters de verdade** (HTTP + in-process), não por hipótese. |

---

## 5. Trade-offs

**Onde o leverage é alto:**
- **Um símbolo** (`snapshot`) substitui: rota de 100 linhas, 4 interfaces duplicadas em types.ts, `refreshState()`, e o conhecimento de "quais efeitos acontecem numa leitura". ~10 call sites colapsam para o mesmo gesto. Deletion test: apagar o module faz a complexidade reaparecer em N callers — ele se paga.
- **Drift impossível por construção**, não por disciplina: o tipo cliente é derivado da função servidora. O custo disso é um `import type` cruzando a fronteira client/server — aceitável num monorepo Next.
- **Localidade**: qualquer mudança de estado (novo campo, novo efeito, novo reset) toca UM arquivo de interface + a implementation; callers ganham o campo de graça ou quebram na compilação — nunca em runtime.
- `notices[]` absorve a próxima dúzia de "toast events" sem tocar na interface — hoje são dois campos ad-hoc (`recentFreezeUsed`, `leagueReset`), amanhã seriam cinco.

**Onde o leverage é fino (assumido):**
- **Sempre retorna tudo.** Shop paga por `progress` que não usa. Numa SQLite local com 1 learner, isso são microssegundos; granularidade de fetch foi trocada por granularidade de selector (grátis). Se um dia pesar, o escape é o parâmetro já existente — não um endpoint novo.
- **Mutações retornando GameSnapshot** acoplam write-side a este tipo — proposital: é o que garante "fresco após ação" sem segundo round-trip.
- **Sem cache**: `snapshot()` não tem cache; quem quiser dedup/throttle faz no store (essa lógica já vive lá).

**Propositalmente fora:**
- Nenhum sistema de subscription/polling/invalidation — o app já re-fetcha após ações; over-engineering para single-device.
- Nenhum schema runtime (Zod) na borda: o tipo derivado já é a garantia; validação runtime seria dupla contabilidade do mesmo contrato.
- Rivals NPC e leaderboard: outro module, outra seam — esta interface serve "o estado do learner", nada mais.
- Nenhum parâmetro de projeção (`?fields=`): caso raro que ainda não existe; quando existir, selectors client-side resolvem 95% dele.