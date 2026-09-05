# Runbook do facilitador — PILOTO P6 (1 página)

| Campo | Definição |
| --- | --- |
| Recorte | 1–3 profissionais não técnicos (pt-BR), mesmo navegador/dispositivo |
| Superfície | [LiteracyDojo público](https://aidevschool-literacydojo.netlify.app/) |
| Jornada | entrada → onboarding → primeira lição → **retry** → retorno em 24–48 h |
| Registro | [Ficha P6](FICHA_P6.md) por participante (`P01`–`P03`); sem gravação |
| Fontes canônicas | [Kit operacional AID-639](../PILOTO_PERCURSO_CLIENTE.md) · [PRD caso-p6](../prioridades/2026-08-17/caso-p6-real-student-pilot/PRD.md) |

O protocolo completo (seleção, convite, consentimento, 3 sessões, severidade,
gate de saída do piloto) pertence ao kit AID-639 — esta página é só o roteiro
de bolso da sessão. Em conflito, vale o kit.

## Antes (dia anterior + 10 min antes)

- [ ] Preflight num perfil de teste (nunca o do participante): link abre,
      primeira lição abre, feedback + dica + **Tentar novamente** aparecem.
- [ ] Consentimento lido e registrado (`sim/não` + horário) — texto do kit §3.
- [ ] Ficha P6 criada por participante; cronômetro só para você.

## Sessão 1 — entrada e primeira conclusão (15–20 min)

Frase única de início: *“Abra este link e vá até concluir a primeira lição.
Eu vou ficar em silêncio para entender o que funciona sem explicação.”*

Marque os tempos da ficha: link aberto → fim do onboarding (5 perguntas →
mapa da Vila Lume) → primeira lição aberta (**Mapa Inicial l02 — “IA não é
uma fonte de verdade”**) → primeira resposta avaliada → primeira conclusão
(critério: ≤ 20 min, sem ajuda).

- **Silêncio:** não explique a interface, não sugira resposta, não provoque
  erro. Impasse: espere 60 s → pergunta neutra (H1) → só depois a menor ajuda.
- **Ajuda:** registre o nível — H0 nenhuma · H1 pergunta neutra · H2 orientação
  de interface · H3 facilitadora opera. Qualquer H1–H3 = etapa **não** foi
  “sem ajuda”.
- **Erro natural (retry):** resposta incorreta → observe se a pessoa lê o
  feedback, acha a dica e usa **Tentar novamente** sozinha. Após a ação dela,
  pergunte só: *“O que essa mensagem está dizendo e o que você faria agora?”*
- Fechamento (4 perguntas do kit §6): ideia principal · exemplo concreto
  (tarefa + ação com IA + como conferir) · o que ficou salvo e o que o produto
  **não** promete · em que momento não soube o que fazer.
- Despedida: *“Se voltar nas próximas 24–48 h, use o mesmo navegador e me
  avise quando entrar. Eu não enviarei lembrete.”*

## Sessão 2 — retorno (24–48 h depois)

Classifique **antes de qualquer contato**: retorno `direto` (observado) /
`relatado` / `não` / `inconclusivo`. Frase: *“Continue de onde você acha que
parou.”* Observe: achou o progresso no mesmo perfil? Soube onde continuar com
H0? Registre o ritmo (quando/por que voltou) na ficha.

## O que nunca prometer

Domínio/certificação por lição concluída (`completed` ≠ `mastered`) ·
sincronização entre dispositivos ou avulso→OS · conta · Trilha Dev no avulso
(“Em breve”) · retenção de longo prazo. Antes de sessão longa, mostre
**Ver seu progresso → Baixar backup JSON**.

## Se travar

| Sintoma | Ação |
| --- | --- |
| Link/caminho central não carrega | 1 retry; pause sem registrar conclusão; registre na ficha |
| Progresso some no mesmo perfil | Confirme perfil/armazenamento; restaure do backup JSON da pessoa |
| Exposição de dado sensível | Interrompa tudo; só evidência desidentificada; defeito Critical |

Defeito Critical/High no caminho central = pausa novas sessões + defeito
aberto antes de revalidar (severidade completa no kit §10). Suporte:
WhatsApp [+55 11 98436-3878](https://wa.me/5511984363878) ·
[daniel@heropa.com](mailto:daniel@heropa.com).

## Depois

Preencha a [Ficha P6](FICHA_P6.md) de cada participante, aplique a revisão de
privacidade do kit e consolide na [síntese](SINTESE_PILOTO.md). O gate de
decisão O3-C2 está em [CRITERIO_O3C2.md](CRITERIO_O3C2.md); a leitura do
funil OP-B (se o board ativar o transporte) está em
[LEITURA_FUNIL_OPB.md](LEITURA_FUNIL_OPB.md).
