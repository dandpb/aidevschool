# AID-146 — validação independente da correção legal de AID-145

**Observação UTC:** 2026-08-24  
**Papel:** QA Lead independente  
**Aplicação:** bundle público CodexDojo OS, superfície LiteracyDojo  
**Disposição:** **GO condicionado para criar novo candidato; sem autorização de deploy**  
**Severidade residual:** **gate operacional de release**

## Resultado executivo

A correção de disponibilidade foi comprovada no artefato local: o build integrado
contém `apps/literacydojo/termos.html` e `privacidade.html` com conteúdo e títulos
corretos, e o JavaScript gerado preserva links relativos que resolvem dentro do
base path do LiteracyDojo.

No primeiro ciclo, o gate de integridade aceitou alteração pós-manifesto de um
documento legal e AID-147 foi aberto como bloqueador. Após a correção, o reteste
independente confirmou hashes SHA-256 para ambos os documentos no manifesto e
rejeição da mesma adulteração. A correção local está apta a gerar um novo
candidato, mas este relatório não autoriza deploy nem libera convites.

## Charters e resultados

| Risco | Verificação | Resultado |
| --- | --- | --- |
| Links legais quebram sob `/apps/literacydojo/` | teste de integração e inspeção do JS de produção | **PASS**: `./termos.html` e `./privacidade.html` |
| Bundle integrado omite documentos ou serve shell SPA | `npm run build:pilot` e inspeção dos arquivos | **PASS**: 1773/1940 bytes; títulos legais corretos |
| Bundle incompleto chega ao deploy | `npm run test:pilot-bundle` | **PASS**: 8/8, incluindo rejeição antes do spawn |
| Conteúdo legal pós-manifesto é detectado | adulteração de cópia temporária + `verifyPilotBundle()` | **PASS após AID-147**: `TAMPER_REJECTED` |
| Fluxo apresenta links no onboarding/rodapé | teste focado `appFlow.test.tsx` | **PASS**: 7/7 |

## Evidência reproduzível

Ambiente: Linux, Node/npm do checkout, 2026-08-24 UTC.

```bash
cd engines/codexdojo-os-prototype
npm run test:pilot-bundle   # reteste após AID-147: 9/9 PASS
npm run build:pilot         # PASS; 17 lições validadas

cd ../literacyDojo
npm run test -- --run tests/app/appFlow.test.tsx  # 7/7 PASS
```

Inspeção do build:

```text
1773 .../apps/literacydojo/termos.html
Termos do piloto | AI Dev School
1940 .../apps/literacydojo/privacidade.html
Privacidade | AI Dev School
./privacidade.html
./termos.html
```

Reteste do defeito: copiar `dist`, acrescentar conteúdo a
`apps/literacydojo/privacidade.html` sem regerar o manifesto e chamar
`verifyPilotBundle(copia)`. Resultado após AID-147:
`TAMPER_REJECTED: ... privacidade.html does not match manifest`.

Hashes observados no build e no manifesto:

```text
termos.html      385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12
privacidade.html 27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487
```

## Triage e disposição

O defeito de integridade foi corrigido e fechado pelo reteste independente.
**GO condicionado para criar novo candidato completo.** Continuam obrigatórios:
autorização executiva aplicável, correlação do candidato com revisão imutável e
QA independente no permalink e alias após eventual deploy. O GO desta revisão
local não deve ser interpretado como release readiness pública.

## Limitações

Não houve deploy nem alteração de produção. Esta revisão comprova empacotamento,
links e integridade do gate local; não emite parecer jurídico, não valida o texto
material dos documentos e não comprova disponibilidade pública futura.
