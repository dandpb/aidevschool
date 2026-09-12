# AID-141 — smoke independente pós-GO do piloto

**Executado em:** 2026-08-24 21:06 UTC  
**Disposição:** PASS pós-GO; release permanece apto dentro do escopo aprovado  
**Candidato:** deploy `6a8c366553da9a55fed22b04`, SHA correlacionado `3586cb587092abea2c4881b2f6a8b926e9487921`

## Resultado executivo

A URL canônica ainda entrega exatamente os cinco pontos de entrada do deploy imutável aprovado. A jornada crítica IA Prática passou em browser limpo nas duas URLs: entrada, hub, início da missão, tentativa correta, conclusão local, fronteira explícita entre recompensa/evidência/veredito/competência canônica e retorno ao hub. Não houve request falha.

O teste reproduziu um defeito **Sev 3, não bloqueante para uso online**: `/sw.js` responde HTTP 200 com o HTML do app e `Content-Type: text/html`, provocando `The script has an unsupported MIME type ('text/html')` no console. Isso invalida o registro do service worker e limita qualquer claim de instalação/offline. A jornada online não foi afetada. Owner recomendado: Founding Engineer, corrigir publicação/roteamento do artefato e retestar offline em issue filha.

## Charters e resultados

| Risco | Resultado | Evidência |
| --- | --- | --- |
| Troca silenciosa após GO | PASS | OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION: HTTP 200 e SHA-256 canônico = imutável = hashes de AID-123. |
| Jornada crítica do primeiro aluno | PASS | Jornada IA Prática concluída nas duas origens; screenshots `canonical-result.png` e `immutable-result.png`. |
| Falso mastery/verificação | PASS | UI afirma que recompensa local, evidência, veredito e competência canônica são registros diferentes; verificador aparece honestamente indisponível. |
| Console/rede | PASS com ressalva | Zero requests falhas; um erro de MIME do service worker em cada origem. |
| Offline/PWA | NO-GO fora do escopo online | `/sw.js` devolve o HTML raiz, não JavaScript; evidência em `sw-headers.txt` e `sw-body.txt`. |

## Reprodução

```bash
node work-products/AID-141/post-go-smoke.mjs
curl -sS -D work-products/AID-141/sw-headers.txt \
  -o work-products/AID-141/sw-body.txt \
  https://aidevschool-codexdojo-os.netlify.app/sw.js
```

Ambiente: Linux, Node 24.18.0, Chromium headless, viewport 1280×800. Resultado estruturado: `post-go-smoke-result.json`.

## Limitações

- Chromium desktop apenas; sem Safari/Firefox/mobile, rede degradada ou aluno real.
- O smoke exercitou integralmente IA Prática; as três rotas Dev foram verificadas por disponibilidade e integridade de hash, não por gameplay completo.
- Não foi executada mutação de deploy, rollback, configuração externa ou estado canônico do learner.
- O aceite continua restrito ao deploy e SHA citados; mudança de artefato invalida esta disposição.

## Disposição final

**DONE / PASS pós-GO**, sem Sev 1 ou Sev 2. O lançamento controlado pode permanecer ativo dentro dos limites de AID-49. Não declarar suporte offline enquanto o defeito Sev 3 do service worker não for corrigido e revalidado.
