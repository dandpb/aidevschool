# SPEC — contrato do build estático do piloto

## Estado atual verificado

O repositório possui um `bundle-missions.mjs` que cria quatro subaplicações:

```text
literacydojo
warehouse
wormhole
relay-station
```

O catálogo possui seis missões, sendo três lições IA que compartilham o runtime LiteracyDojo e
três missões Dev apoiadas pelos três runtimes voxel.

## Contrato

1. `netlify.toml` deve executar `npm install && npm run build:pilot`.
2. As URLs de runtime devem ser relativas:
   - `/apps/literacydojo/`;
   - `/apps/warehouse/`;
   - `/apps/wormhole/`;
   - `/apps/relay-station/`.
3. `runtimeUrl()` deve acrescentar `hosted=1` e `hostOrigin`.
4. O smoke não pode subir os dev-servers das missões.
5. O smoke deve falhar se o iframe retornar a `127.0.0.1` ou se o body interno não montar.

## Verificador adicionado ao caso

```text
python3 docs/prioridades/2026-08-17/caso-p2-os-pilot/verify_pilot_config.py
```

Ele confere apenas o contrato textual do `netlify.toml`; o Playwright continua sendo a prova de
montagem real.

## Limites

O contrato prova a configuração e o smoke prova duas missões representativas. Não prova todas as
combinações de navegador, uma publicação nova ou a jornada completa de seis missões.
