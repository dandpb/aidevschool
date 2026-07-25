# Definir a topologia das duas trilhas

Type: grilling
Status: open
Blocked by: 01, 02, 09

## Question

Qual deve ser a topologia apresentada à pessoa aprendiz: entradas de IA na Prática e Trilha Dev,
papel do codexDojo OS e do dashboard, descoberta entre trilhas e transições permitidas, sem
misturar os bounded contexts das engines?

Decisão concreta que a resposta precisa tomar: `dojoToday` e `codexdojo-os-prototype` **se
sobrepõem como entrada da Trilha Dev**. O `dojoToday` é a única superfície com público declarado
"programadores" e já ligada ao FSRS, mas embute só o jogo 02 e não tem suíte de testes; o Engine
Hub do OS já compõe 6 engines com 70 testes verdes e o MANIFEST já o chama de canônico, mas o
diretório ainda se chama "prototype" e nenhum ADR ratificou a promoção. Ver
[Inventariar as engines disponíveis para a Trilha Dev](01-inventariar-engines-da-trilha-dev.md),
lacunas 2–4.
