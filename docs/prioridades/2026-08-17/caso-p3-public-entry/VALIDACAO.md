# VALIDAÇÃO — P3: entrada pública da trilha IA Prática

## RED — baseline versionado

O teste foi executado contra o README do `HEAD`, antes da correção desta rodada:

```bash
python3 docs/prioridades/2026-08-17/caso-p3-public-entry/verify_public_entry.py <(git show HEAD:README.md)
```

Resultado real:

```text
public entry verification: FAIL
- missing public LiteracyDojo link: https://aidevschool-literacydojo.netlify.app
- stale no-public-route sentence is still present
```

Isso confirmou uma contradição concreta: a documentação dizia que não havia rota pública, enquanto
`docs/VISION.md` já documentava a URL e a URL respondia HTTP 200.

## Correção aplicada

`README.md` agora:

- aponta LiteracyDojo como a primeira rota browser-only pública;
- informa que ela é local-first e sem conta;
- explica que o progresso fica no navegador;
- mantém o caminho de programação e o CodexDojo OS como superfícies separadas.

## GREEN — verificador textual

```bash
python3 docs/prioridades/2026-08-17/caso-p3-public-entry/verify_public_entry.py
```

Resultado real:

```text
public entry verification: PASS
public LiteracyDojo link: present
stale no-public-route sentence: absent
Dev track scope: unchanged
```

## Disponibilidade HTTP

```bash
curl -sS -L -o /dev/null -w 'literacydojo_http=%{http_code}\\n' \\
  --max-time 30 https://aidevschool-literacydojo.netlify.app
```

Resultado real:

```text
literacydojo_http=200
```

## Entregue de verdade

- `README.md` agora aponta para LiteracyDojo.
- A frase contraditória foi removida.
- A distinção entre LiteracyDojo, trilha Dev e CodexDojo OS foi preservada.
- A rota existente foi verificada por HTTP 200.

## Não entregue / limites

- Não houve deploy novo nesta rodada.
- HTTP 200 não prova que uma pessoa completou uma lição, voltou depois ou aprendeu.
- Não houve teste com aluno real.
- Não foi declarado que a trilha Dev está pronta.
- O teste protege a consistência do README; não monitora a disponibilidade continuamente.

## Aprendizado promovido

Uma rota que existe mas não é encontrável não é uma entrada de produto confiável. Primeiro devemos
alinhar a promessa documental com o caminho que uma pessoa consegue abrir; depois medir uso real.

## Status dos critérios

- [x] O README contém a URL pública da trilha IA Prática.
- [x] O README não afirma que não há rota browser-only.
- [x] A URL pública responde HTTP 200 nesta rodada.
- [x] A trilha Dev continua marcada como caminho distinto.
