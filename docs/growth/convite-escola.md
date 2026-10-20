# Convite `/escola/` — copy PT-BR (self-service O1)

Copy curta, voz do produto (lições curtas no ritmo Duolingo). Nada além do roteiro do
teste. Versão para link direto na página `/escola/` do site AiDevSchool.

## Copy do convite (versão dev)

> **Dev, teste 3 lições + 2 práticas guiadas — no seu tempo (~40 min).**
> Estamos testando a trilha **IA para Dev** do AiDevSchool: lições curtas no ritmo
> Duolingo para quem constrói software com IA. O percurso é auto-guiado: 3 lições no app
> (`l27`–`l29`) e 2 práticas guiadas do repositório (`pg-d02`, `pg-c01`), com feedback
> curto no fim. Sem instalar nada, sem conta, sem custo. Quer participar?
> [Comece pelo roteiro](https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md).

Regras: não prometer recompensa/incentivo/certificado; não prometer "mudar seu jeito de
programar"; não coletar nada além de e-mail no consentimento.

## Snippet pronto para a página `/escola/` (execução: lane de produto)

Local sugerido: bloco da jornada dev (`#jornada-dev`) ou rodapé do hero — decisão final é
da lane de produto/UX. HTML proposto:

```html
<!-- AID-909: convite self-service O1 (dev) — remover ao fim da onda O1 -->
<a class="primary" href="https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md"
   rel="noopener">Devs: teste a trilha IA para Dev — roteiro self-service (~40 min)</a>
```

Texto alternativo curto (se couber só 1 linha):

```html
<a href="https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md" rel="noopener">Devs: roteiro self-service de teste (~40 min)</a>
```

## Copy do convite (versão e-mail/DM, para reuso)

> Oi! Estamos testando a trilha IA para Dev do AiDevSchool — lições curtas no ritmo
> Duolingo. Roteiro assíncrono de ~40 min: 3 lições no app + 2 práticas guiadas. Sem
> conta, sem instalação. Se topa, começa aqui: [roteiro self-service](https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md)
> (consentimento de 1 página no início — pesquisa moderada, sem PII além do seu e-mail).

## Métrica de contato (honestidade)

Um `contato` conta somente com **envio confirmado** (receipt do canal — post/link ativo
publicado, envio de e-mail registrado). Analytics de clique **não** é evidência de funil.
