# Guia de correção TP-C01 (cotidiano) — enunciado v1 / rubrica v1

> MATERIAL DO CORRETOR — não entregar junto com o enunciado. Em produção, este
> guia fica fora do pacote do aluno.

## Gabarito dos vereditos (7 afirmações de `insumos/resposta-ia.md`)

| nº | Afirmação (resumo) | Veredito | Citação | Justificativa |
|---|---|---|---|---|
| 1 | Prazo de 45 dias corridos | **contrariada** | fonte-1 L2 | A política fixa **30 dias corridos** após o retorno; 45 é invenção. |
| 2 | Pedidos > R$ 500 exigem aprovação da gestão | **apoiada** | fonte-1 L3 | Texto idêntico ao da política (aprovação prévia da gestão imediata). |
| 3 | Táxi com limite diário de R$ 80, "igual alimentação" | **contrariada** | fonte-2 L1, L2 | Alimentação = R$ 80 (L1), táxi = **R$ 60** (L2); a IA fundiu duas categorias e estourou o limite do táxi. |
| 4 | Dividir em dois pedidos menores para agilizar | **contrariada** (perigosa) | fonte-1 L4 | A política **proíbe fracionamento** para contornar limites/aprovações — repassar isso ao Jonas orientaria violação. |
| 5 | "Garante" reembolso de upgrade/mimos | **contrariada** | fonte-1 L6, L7 | L6 lista upgrades de conforto como **não reembolsáveis** salvo autorização excepcional por escrito do diretor; "garante" inverte a regra. A exceção existe, mas depende de documento que o caso não tem. |
| 6 | "Poços é cidade polo, limite R$ 450/noite" | **fontes não dizem** | fonte-2 L3, L4 (insuficientes) | A tabela separa polo (R$ 450) de demais (R$ 300), mas **nenhuma fonte lista Poços de Caldas** em categoria. Não decidível com o pacote: pergunta certa = "qual enquadramento de Poços vale — existe lista oficial de cidades polo?" para o administrativo/gestão. |
| 7 | Colar cartão completo + CPF "para agilizar" | **contrariada** (privacidade) | fonte-1 L8; fonte-3 L4 | L8 veda colar dados sensíveis em ferramentas de IA; cartão corporativo completo e CPF são sensíveis (fonte-3 L4 mostra o dado circulando por e-mail — agravante, não autorização). |

Correção do c1: 6+ vereditos corretos = suficiente (ver rubrica). O par 5/6
separa quem lê exceção de quem lê "garantia"; o par 1/3 separa quem confere
número de quem confia no tom.

## Incertos e próximos passos (modelo c3)

- Falta: enquadramento de Poços (polo ou não) → perguntar ao
  administrativo/gestão: "Poços de Caldas entra na lista de cidade polo da
  Tabela de Limites? Onde essa lista oficial vive?" Consequência da decisão:
  R$ 150/noite de diferença (fonte-2 L3 vs L4).

## Decisão de privacidade (modelo c4)

- Classificação: nº de cartão completo e CPF = **sensíveis** (identificam
  pessoa/finança); matrícula interna = dado interno, não para IA.
- A política manda (fonte-1 L8): dados sensíveis só no formulário oficial do
  sistema de reembolso — nunca em ferramenta de IA.
- Ação da Marina: recusar o pedido da IA, avisar o Jonas para não mandar
  esses dados por e-mail/chat, e não colar nada além das categorias de despesa.

## Resposta pronta ao Jonas (modelo c5)

> Jonas, para o reembolso: submete no sistema em até **30 dias corridos** da
> volta (política L2); se passar de **R$ 500** no total, precisa da aprovação
> do teu gestor antes (L3). Táxi tem limite diário de **R$ 60** e alimentação
> de **R$ 80**, com recibo nominal — manda tudo num pedido só, por categoria;
> **não divide em pedidos menores** pra agilizar, a política proíbe (L4). Sobre
> o limite de hospedagem em Poços, estou confirmando o enquadramento e te
> volto ainda hoje. E por favor: **não me manda CPF nem nº de cartão** — isso
> vai só no formulário oficial do sistema.

## Erros que calibram a rubrica

- Marcar 6 como `apoiada` "porque R$ 450 existe na tabela" (o valor existe; o
  enquadramento de Poços não).
- Marcar 5 como `apoiada` "porque existe autorização excepcional" (exceção ≠
  garantia; não há documento no caso).
- Marcar 1 como `fontes não dizem` "porque pode ter atualização" — a fonte
  fornecida decide; atualização hipotética não é incerteza do pacote.
- Recusar o CPF mas sugerir mandar por e-mail "mais seguro" (agrava).

## Segunda tentativa — afirmação nova da "IA que insiste"

Rascunho revisado insiste: "**Confirmo o prazo de 45 dias — a política antiga
dizia 30, mas a tabela vigente atualiza para 45.**" Resposta esperada:
`contrariada`, re-citando fonte-1 L2 + fonte-2 (a tabela trata limites de
categoria, não prazos — nenhum item do pacote menciona 45). Recusar a
"confirmação" da IA: repetição não é fonte (âncora l09/l20 em problema novo).
