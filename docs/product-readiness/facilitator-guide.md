# Guia do facilitador

Turma paga, duas superfícies: LiteracyDojo avulso e OS (link estático). Pode ensinar primeira lição e IA Prática no OS. Não venda esses dois como customer-ready: no main, depois do #147, estão stale. O que a matriz ainda concede é retorno no mesmo aparelho e as missões voxel. #143 não está no produto; sem checkout neste guia.

Comandos e diagnóstico técnico continuam nos READMEs dos engines.

Para piloto humano de 1–3 pessoas só no LiteracyDojo, use também o
[kit operacional](../PILOTO_PERCURSO_CLIENTE.md).

## Turma paga: roteiro rápido

| Etapa | O que fazer |
| --- | --- |
| Antes | Escolha a superfície (LiteracyDojo avulso **ou** OS). Teste o link no navegador da turma. Combine: mesmo aparelho, sem prometer sincronização nem domínio pela UI. |
| Abertura (2 min) | Diga que não há conta; progresso fica no navegador; **concluída ≠ competência verificada**; Trilha Dev no LiteracyDojo avulso está “em breve”. |
| Durante | Observe sem conduzir cada clique. No LiteracyDojo, mostre **Ver seu progresso → Baixar backup JSON** antes de sessão longa. |
| Verificador (OS) | No deploy estático, “Verificador indisponível” é honesto — não venda como certificação. |
| Suporte | WhatsApp [+55 11 98436-3878](https://wa.me/5511984363878) (principal) e [daniel@heropa.com](mailto:daniel@heropa.com) — SLA informal: 1 dia útil. |
| Fechamento | Pergunte: “O que ficou salvo? O que você faria em seguida?” Registre sintoma visível e contexto (navegador/aparelho). |

**Não inclua na oferta paga:** miniTown, trilha de programador avulsa, PixelQuest
ou catálogo voxel fora do OS — são experimentais ou exigem setup que este guia
não cobre.

## Standalone LiteracyDojo

### Preparar

- Confirme [https://aidevschool-literacydojo.netlify.app](https://aidevschool-literacydojo.netlify.app/)
  no navegador e aparelho previstos.
- Use perfil de navegador separado para demonstração; não apague dados do
  participante.
- Explique: sem conta; progresso local; primeira lição do percurso é **“IA não é
  uma fonte de verdade”**; concluída não é domínio verificado.
- Antes de sessão longa: **Ver seu progresso → Baixar backup JSON**; importação
  repõe no mesmo navegador e continua limitada a concluída.
- Setup local, conteúdo e release: [README do LiteracyDojo](../../engines/literacyDojo/README.md).

### Observar

Peça para abrir o link, concluir o onboarding, fazer a primeira lição, errar uma
vez, corrigir e dizer o próximo passo. Pergunte: “O que foi salvo? Isso é
domínio?” Registre falhas visíveis e intervenções.

### Recuperar

| Sintoma | Recuperação segura | Escalar quando |
| --- | --- | --- |
| Link não abre | Testar conexão, tentar uma vez, pausar sem marcar conclusão. | Continua fora ou redireciona mal. |
| Lição some ou trava após erro | Voltar ao mapa e reabrir a lição. | Feedback ou tentar de novo indisponíveis. |
| Progresso sumiu após recarregar | Mesmo perfil e armazenamento ligado; restaurar JSON se houver. | Some de novo sem backup. |
| Troca de aparelho/navegador | Explicar que começa do zero; só restaura com export do participante. | Promessa de continuidade quebrada. |
| Precisa de humano | WhatsApp ou e-mail acima (1 dia útil). | Participante não alcança o contato. |

### Avaliar

Passa se a pessoa entra sem conhecimento do repositório, usa feedback e retry,
chega a resultado local concluído, explica que não é domínio e nomeia o próximo
passo suportado.

## codexDojo OS guided journey

### Preparar

- Teste [https://aidevschool-codexdojo-os.netlify.app](https://aidevschool-codexdojo-os.netlify.app/):
  missão de IA Prática e as três missões voxel (WAREHOUSE, WORMHOLE, RELAY
  STATION) devem abrir **no mesmo site** (hospedadas).
- Perfis separados para primeira visita e retorno; não limpe o navegador do
  participante.
- Verifique teclado (Trilha Dev) e projeção acessível com movimento reduzido.
- Diga: conclusão no hub é local; verificador pode estar **indisponível** no
  deploy estático; a UI não concede domínio; número de “competências verificadas”
  no painel vem de registro canônico da escola, não da missão que acabou de
  fazer.
- Build e smoke do piloto: [README do OS](../../engines/codexdojo-os-prototype/README.md).

### Observar

**Primeira visita:** escolher trilha, abrir missão hospedada, ler resultado,
dizer próximo passo. **Retorno:** recarregar e explicar o que voltou. Na Trilha
Dev, distinguir conclusão local, evidência bruta e verificação (quando existir).

### Recuperar

| Sintoma | Recuperação segura | Escalar quando |
| --- | --- | --- |
| Piloto ou missão não carrega | Confirmar link, tentar uma vez, sair sem marcar conclusão. | Origem errada ou frame vazio persistente. |
| Verificador indisponível | Manter estado visível; tentar uma vez; usar suporte ou voltar ao hub **sem** afirmar aprovação. | UI implica domínio ou verificação sem prova independente. |
| Estado não retoma | Mesmo perfil e armazenamento; recomeçar onboarding se dados foram apagados. | Some de novo no mesmo perfil. |
| WebGL falha | Projeção acessível + teclado. | Nenhuma projeção completa a interação principal. |

### Avaliar

Passa se escolhe trilha, entra e sai da missão hospedada, explica resultado e
próximo passo, retoma no mesmo aparelho e não confunde conclusão local com
domínio ou verificação.

## Programmer journeys

**Fora da oferta paga.** Não monte turma cobrada em dojoToday, PixelQuest ou
voxelDojo avulso sem revalidar a matriz e um runbook próprio. Se alguém pedir
programação, encaminhe para outro momento — não use este guia como manual de
venda.

## Experimental: miniTown

**Fora da oferta paga.** Só exploração local, sem progresso. Se a pessoa quer
lição guiada, use [LiteracyDojo avulso](student-guide.md#standalone-literacydojo).
