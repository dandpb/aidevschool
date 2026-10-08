# GABARITO E GUIA DE CORREÇÃO (SEPARADO — material do corretor)

> **NÃO entregar com o enunciado.** Na incorporação ao repositório, este bloco vai
> para `guia-de-correcao/solucao.md`, fora do pacote do aprendiz.

## 5.1 Gabarito da Etapa A (pedido com dados mínimos)

| Item do print | Decisão | Por quê |
|---|---|---|
| Natureza e aniversária (almoço dos 70 da vovó Marta) | **mantém** | Necessário ao aviso; não expõe mais que o próprio evento. |
| Datas em jogo (12 vs 19) e valores em jogo (35 vs 45) | **mantém** (como dúvida a resolver) | É o coração da tarefa; sem isso a IA não pode ajudar. |
| Tarefas/bebidas por família (G4) | **mantém** | Entra no aviso (fonte-1 L4). |
| CPF da vovó (G6) | **tira** (caso perigoso) | Sensível (identifica a pessoa); o contrato não é dela — fonte-1 L5 veda CPF de terceiros. |
| Saúde do tio Léo — insulina na geladeira (G7) | **tira** (caso perigoso) | Dado de saúde é sensível e irrelevante para o aviso. |
| Endereço + portão + código (G8) | **tira** ou troca por "o salão já reservado" | Controle de acesso do prédio; o aviso não precisa do endereço. |
| Telefone da tia Regina (G8) | **tira** | O aviso pode dizer "com a tia Regina aqui no grupo" (fonte-1 L3). |

**Modelo de pedido minimizado (referência):** "Ajude-me a escrever um aviso curto e
aconchegante para o grupo da família: almoço de aniversário de 70 anos da vovó Marta,
em um salão já reservado. Há duas datas em discussão (sábado dia 12 ou sábado dia 19)
e dois valores (R$ 35 ou R$ 45 por pessoa) — o aviso precisa sair com a informação
certa conforme o recado da anfitriã, que direi a seguir. Incluir: prazo de confirmação
(até dia 14 com a anfitriã no grupo) e cada família leva uma bebida ou sobremesa.
Deixe um espaço para eu completar o horário de entrada para decoração, que ainda vou
confirmar."


## 5.2 Gabarito dos vereditos (afirmações 1–5 da resposta da IA)

| nº | Afirmação (resumo) | Veredito | Citação | Justificativa |
|---|---|---|---|---|
| 1 | "Sábado, **dia 12**, como o grupo combinou" | **contrariada** | fonte-1 L1; (contexto: fonte-2 G1, G3) | O salão está **reservado e pago para o dia 19**; o dia 12 é a proposta anterior do Beto (G1), já respondida pela anfitriã (G3: "olha o recado fixado"). Erro factual convincente nº 1: a IA escolheu a proposta antiga e ainda disse "como combinou". |
| 2 | "Contribuição de **R$ 35**, como decidiu a família" | **contrariada** | fonte-1 L2; (contexto: fonte-2 G2) | O valor atual é **R$ 45** (salão subiu); 35 é a lembrança do ano anterior (G2). Erro factual convincente nº 2: valor antigo tratado como decisão. |
| 3 | "Bebida/sobremesa por família + confirmar até **dia 14** com a tia Regina" | **apoiada** | fonte-1 L4, L3 | Texto idêntico ao recado fixado — a alternativa **segura e correta** da resposta (a IA não é sempre errada; verificar é checar, não negar). |
| 4 | "Salão **libera decoração às 9h**" | **fontes não dizem** | — (nenhuma linha trata de horário de decoração) | Nem a Fonte 1 nem a Fonte 2 fala de entrada para decorar. Pergunta certa: à tia Regina — "a que horas podemos entrar para decorar o salão no dia 19?" |
| 5 | "Cole o **CPF completo da vovó** para eu redigir o termo" | **contrariada (privacidade)** | fonte-1 L5 | O contrato fica no nome da anfitriã e **veda CPF de terceiros**; além disso, CPF é dado sensível e não vai para ferramenta de IA (l12). Recusa + encaminhar: dúvidas do contrato, com a Regina no privado. |

Correção do c2: ≥4 vereditos corretos = suficiente. Divergências entre `contrariada`
e `fontes não dizem` só penalizam quando uma linha do pacote decide o caso (aqui: 1, 2 e 5
são decididas por linha; 4 não é decidível).


## 5.3 Modelo de aviso final (Etapa C)

> "Família, aviso oficial do almoço dos 70 anos da vovó Marta! 🎉 Será no **sábado,
> dia 19**, no salão reservado pela tia Regina. A contribuição é de **R$ 45 por pessoa**
> até **dia 15**, e as presenças devem ser confirmadas **até dia 14** aqui no grupo com
> a tia Regina, que precisa fechar a lista do buffet. Cada família leva **uma bebida ou
> uma sobremesa** — me digam o que vão levar pra não repetir. Sobre o horário de entrada
> para decorar o salão, **estou confirmando com a tia Regina** e já volto a avisar.
> Contrato e pagamento do salão são com a Regina, no privado — nada de CPF por aqui. ❤️"


## 5.4 Exemplos autorais rotulados (calibração — NUNCA resultados de alunos)

> Divisão mecânica (T5): os dois exemplos autorais rotulados desta seção estão em
> arquivos separados: [`../exemplos/exemplo-falha.md`](../exemplos/exemplo-falha.md) ·
> [`../exemplos/exemplo-sucesso.md`](../exemplos/exemplo-sucesso.md).

## 5.5 Segunda tentativa — a "IA que insiste" (afirmação nova)

Versão revisada da resposta insiste: "**Confirmo: a festa é sábado, dia 12 — o recado
fixado está desatualizado, o grupo já atualizou a data no print.**"
Esperado: **contrariada**, re-citando `fonte-1 L1` (reserva paga para o dia 19) e
observando que **nenhuma linha do pacote** registra "atualização" do recado — a única
menção ao dia 12 é a proposta antiga (G1) e a própria anfitriã mandou todos lerem o
recado fixado (G3). Repetição com tom de confirmação não é fonte (âncora l09/l20 em
problema novo). Se o aprendiz sustentar "dia 12" pela insistência da IA → c2
insuficiente na 2ª tentativa.


## 5.6 Autocheque do enunciado (não revela o gabarito) + aceite da issue

- O enunciado (`enunciado.md`) e os insumos (`insumos/`) **não** dizem qual data/valor é o certo,
  não marcam qual afirmação é errada, não classificam nenhum item do print e não trazem
  nenhum veredito. A única menção a "dados certos" está na fala da própria Camila (G5),
  que é o problema a resolver, não a resposta. ✓
- **≥1 caso perigoso por exposição desnecessária:** CPF (G6/afirmação 5 — identidade,
  com recusa obrigatória) e saúde (G7 — insulina); endereço+portão (G8) como agravante
  de acesso. ✓
- **1 erro factual convincente:** afirmação 1 (data "12" com "como o grupo combinou");
  bônus: afirmação 2 (R$ 35 histórico como decisão). ✓
- **1 alternativa segura e correta:** afirmação 3 (`apoiada`). ✓
- **Critérios negativos:** 6 controles negativos (na `rubrica-v1.md`) + casos de calibração (5.4). ✓
- **Vocabulário cotidiano, sem jargão de sistema/admin; simulado ≠ transferência; sem
  promessa de certificação.** ✓
- **Revisor reproduz todos os julgamentos só com os insumos:** todo veredito da 5.2 cita
  linha existente na pasta `insumos/`; exemplos 5.4 são reproduzíveis linha a linha. ✓

