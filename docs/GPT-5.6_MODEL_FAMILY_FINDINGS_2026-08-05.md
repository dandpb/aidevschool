# GPT-5.6 Sol, Terra e Luna — findings

**Data:** 2026-08-05  
**Escopo:** comparação da família GPT-5.6 usando apenas fontes primárias da OpenAI.  
**Método:** fatos publicados pela OpenAI separados de inferências; não foram usados benchmarks ou rate cards de terceiros.

## Resumo executivo

- **Sol** é o tier flagship; **Terra** é o tier balanceado/de menor custo; **Luna** é o tier mais rápido e econômico. A OpenAI diz que os nomes são tiers duráveis de capacidade, enquanto “5.6” identifica a geração.
- No produto, **Medium, High e Extra High usam GPT-5.6 Sol**; `max` é uma configuração de esforço disponível no ChatGPT Work e Codex. A documentação pública não define um orçamento de tokens, limite de tempo ou multiplicador de custo específico para Medium versus Max.
- Na API, a tabela publicada é por modelo, não por esforço: Sol custa US$5/US$30, Terra US$2,50/US$15 e Luna US$1/US$6 por 1M de tokens de entrada/saída. Cache read recebe 90% de desconto; cache writes custam 1,25× a entrada sem cache.
- A OpenAI publica resultados agregados e alguns resultados configurados com `max`, mas **não publica latência exata de Luna Max**. Também não há, nas fontes consultadas, uma tabela pública comparando latência de Sol/Terra/Luna em Medium e Max.

## Comparação dos tiers

| Tier | Posicionamento oficial | API (entrada / saída por 1M tokens) | Codex rate card por 1M tokens (entrada / cache / saída) |
|---|---|---:|---:|
| GPT-5.6 Sol | Flagship, maior capacidade | US$5 / US$30 | 125 / 12,5 / 750 créditos |
| GPT-5.6 Terra | Balanceado, trabalho cotidiano; competitivo com GPT-5.5 | US$2,50 / US$15 | 50 / 5 / 300 créditos |
| GPT-5.6 Luna | Mais rápido e mais acessível; workloads de alto volume sensíveis a custo | US$1 / US$6 | 5 / 0,5 / 30 créditos |

Os valores de API vêm do anúncio de disponibilidade geral e das páginas oficiais de modelo/preços. Os valores de créditos são do rate card do Codex; não devem ser confundidos com preço em dólares nem com uma medição de latência.

## Esforço de raciocínio: Medium versus Max

**Fatos publicados:**

- No ChatGPT, Medium é descrito como raciocínio padrão com Sol; High como raciocínio estendido; Extra High como o maior esforço disponível com Sol; Pro usa Sol Pro.
- No ChatGPT Work e Codex, `max` pode ser ativado por usuários com acesso ao GPT-5.6. No Codex, `ultra` está disponível para Plus ou superior; no ChatGPT Work, para Pro e Enterprise.
- O anúncio diz que `max` foi introduzido para dar a Sol mais tempo para raciocinar profundamente. `ultra` coordena múltiplos agentes/subagentes e, portanto, não é simplesmente outro orçamento de raciocínio de um único modelo.
- No rate card Business/Enterprise/Edu, Medium, High e Extra High usam Sol e custam os mesmos 10 créditos por mensagem; elevar o esforço não eleva a taxa por mensagem. Esse card não lista `max` como uma linha separada.

**Limite da evidência:** a OpenAI não publica uma equivalência numérica entre Medium e Max (por exemplo, tokens de raciocínio, segundos, número de passes ou créditos por tarefa). Portanto, “Max é melhor/lento/caro por chamada” é uma inferência operacional plausível, não um número oficial publicado. O custo real na API/Codex depende dos tokens consumidos.

## Benchmarks oficiais publicados

Os resultados abaixo são os números apresentados pela própria OpenAI no anúncio de disponibilidade geral; os nomes dos benchmarks e suas metodologias devem ser lidos como publicados, sem tratá-los como uma auditoria independente.

| Avaliação | Sol | Terra | Luna | Observação |
|---|---:|---:|---:|---|
| Agents’ Last Exam | 52,7% | 50,4% | 50,3% | Fluxos profissionais de longa duração |
| GDPval-AA v2 | 1.747,8 Elo | 1.593 Elo | 1.591,8 Elo | Trabalho profissional |
| Management Consulting Tasks (internal) | 43,2% | 37,2% | 35,4% | Avaliação interna |
| Big Finance Bench | 53% | 51% | 36% | Avaliação publicada pela OpenAI |
| Artificial Analysis Intelligence Index v4.1 | 58,9 | 55,0 | 51,2 | Índice amplo; a OpenAI cita a fonte externa |

Outros pontos publicados: Sol alcança 92,2% em BrowseComp e 62,6% em OSWorld 2.0; no Artificial Analysis Coding Agent Index v1.1, Sol com `max` obtém 80. A OpenAI também afirma que Terra supera GPT-5.5 em algumas avaliações a menor custo e que Luna quase alcança o pico do GPT-5.5 por menos da metade do custo estimado, mas essas frases são comparações resumidas, não uma matriz completa por esforço.

## Velocidade e latência

**Medições/estimativas publicadas:**

- Em benchmarks internos e externos de pull requests, a OpenAI afirma que GPT-5.6 superou GPT-5.5 em F1 usando aproximadamente 3× menos tokens e entregando cerca de 2× menor latência mediana. O trecho não separa Sol, Terra e Luna nem Medium/Max.
- No Artificial Analysis Intelligence Index, a OpenAI afirma que Sol com `max` conclui tarefas em 61% menos tempo que o comparativo citado, por aproximadamente metade do custo estimado. No Coding Agent Index, afirma que Sol com `max` usa menos da metade do tempo do comparativo.
- Para uma implantação específica, a OpenAI anunciou Sol na Cerebras “até 750 tokens por segundo”, inicialmente para clientes selecionados. Isso é um teto de provedor/implantação para Sol, não uma velocidade geral da família e não uma medição de Luna.

**O que não está publicado:** não encontrei uma latência exata, percentil, throughput ou tokens/s para **Luna Max**. Também não encontrei uma tabela oficial com latência de cada tier em Medium versus Max. “Luna é o mais rápido” é posicionamento oficial; não autoriza converter a afirmação em um número.

As notas da prévia alertam que estimativas de latência/custo simulam comportamento de produção, incluem detalhes de tool calls, tokens amostrados e tokens de entrada, e podem variar substancialmente no mundo real. Isso impede comparar os números resumidos como se fossem uma medição universal de API.

## Créditos e disponibilidade

- No rate card Business/Enterprise/Edu, Sol custa 10 créditos por mensagem; Medium, High e Extra High têm a mesma taxa. Sol Pro custa 50 créditos por mensagem.
- No rate card do Codex, o modelo é cobrado por tokens e não por um orçamento fixo de esforço. As taxas são as da tabela acima; a mesma página mantém médias legadas de tarefas locais: aproximadamente 14 créditos Sol, 6 Terra e 1 Luna por mensagem.
- A disponibilidade é dependente do produto/plano: Sol é o modelo de raciocínio nas conversas elegíveis do ChatGPT; Terra e Luna não são selecionáveis em conversas padrão do ChatGPT, mas estão disponíveis conforme plano em Work/Codex e na API.

## Inferências úteis para decisão

- Para maximizar qualidade em tarefas longas, Sol com esforço alto/Max é a opção mais defensável, mas a melhoria e o tempo adicionais precisam ser medidos no workload real.
- Terra parece o ponto de equilíbrio custo/capacidade: metade do preço de Sol e resultados próximos dele em algumas avaliações, sem garantia de paridade em todos os domínios.
- Luna é a opção de volume/custo; “mais rápido” é uma afirmação oficial de posicionamento, não um SLA de tokens/s. Para comparar Medium/Max ou dimensionar orçamento, é necessário medir chamadas representativas e registrar tokens, tempo até o primeiro token e tempo total.

## Fontes primárias

1. [GPT-5.6: Frontier intelligence that scales with your ambition — OpenAI, 2026-07-09](https://openai.com/index/gpt-5-6/) — lançamento geral, tiers, benchmarks, disponibilidade, preços e comparações de tempo/custo.
2. [Previewing GPT-5.6 Sol — OpenAI, 2026-06-26](https://openai.com/index/previewing-gpt-5-6-sol/) — preview, `max`/`ultra`, notas metodológicas de latência e anúncio de Sol na Cerebras.
3. [GPT-5.6 in ChatGPT — OpenAI Help Center](https://help.openai.com/en/articles/20001354-gpt-5-6-in-chatgpt) — mapeamento Medium/High/Extra High/Pro, limites e disponibilidade por plano.
4. [ChatGPT Rate Card — OpenAI Help Center](https://help.openai.com/en/articles/11481834-chatgpt-rate-card) — créditos por mensagem e esforço no Business/Enterprise/Edu.
5. [Codex rate card — OpenAI Help Center](https://help.openai.com/en/articles/20001106-codex-rate-card) — créditos por token e médias legadas por tarefa.
6. [GPT-5.6 Luna model page — OpenAI API](https://developers.openai.com/api/docs/models/gpt-5.6-luna) — posicionamento, contexto, output máximo e preço oficial de Luna.
7. [GPT-5.6 preview system card — OpenAI](https://deploymentsafety.openai.com/gpt-5-6-preview/gpt-5-6-preview.pdf) — avaliações técnicas adicionais da prévia, incluindo resultados Sol/Terra/Luna em HealthBench.
