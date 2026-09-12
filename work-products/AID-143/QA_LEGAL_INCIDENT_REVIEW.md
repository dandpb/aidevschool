# AID-143 — revisão independente do incidente legal de AID-140

**Observação UTC:** 2026-08-24  
**Papel:** QA Lead independente  
**Aplicação:** bundle público CodexDojo OS, especificamente LiteracyDojo  
**Disposição:** **NO-GO / HOLD para novos convites**  
**Severidade:** **ALTA (P1 de release)**

## Resultado executivo

O incidente foi reproduzido independentemente. No alias canônico e no deploy
imutável autorizado, as quatro URLs legais plausíveis retornam HTTP 200 com o
HTML de 608 bytes e `<title>codexDojo OS</title>`, não os documentos de termos e
privacidade. O status 200 é fallback da SPA e não comprova disponibilidade do
documento.

O deploy anterior indicado para rollback (`6a877a6a68d0cee5f09b3934`) apresenta o
mesmo defeito. Portanto, **o rollback proposto em AID-140 não é mitigação válida
para este incidente**. O site standalone do LiteracyDojo publica os documentos
corretamente, mas isso não os torna acessíveis no domínio/bundle autorizado.

Não classificado como crítico de disponibilidade: a aplicação abre. É bloqueador
de release porque o onboarding declara concordância/leitura de documentos que o
artefato lançado não disponibiliza. A avaliação jurídica material cabe ao CEO e
assessoria jurídica; QA comprova o defeito funcional e o risco de consentimento
não informado.

## Charters e evidência

| Risco | Verificação | Resultado |
| --- | --- | --- |
| Documento legal ausente no alias | GET de `/termos.html`, `/privacidade.html`, `/apps/literacydojo/termos.html` e `/apps/literacydojo/privacidade.html` | **FAIL**: todos 200, 608 bytes, shell `codexDojo OS` |
| Candidato diverge do alias | Mesmos GETs no deploy `6a8c366553da9a55fed22b04` | **FAIL idêntico**; alias correlacionado ao candidato |
| Rollback mitiga o defeito | Mesmos GETs no deploy anterior `6a877a6a68d0cee5f09b3934` | **FAIL idêntico**; rollback ineficaz |
| Documento existe em origem alternativa | GET no site standalone do LiteracyDojo | **PASS parcial**: `/termos.html` = 1772 bytes, título `Termos do piloto`; `/privacidade.html` = 1939 bytes, título `Privacidade` |
| Bundle lançado referencia os documentos | Busca por `termos`, `privacidade`, `Termos`, `Privacidade` no JS publicado `index-DFSOA5dz.js` | **FAIL**: zero ocorrências; não há evidência de links legais no bundle publicado |

## Reprodução

Ambiente: Linux, execução em 2026-08-24 UTC, `curl` com redirect habilitado,
rede pública. Comando mínimo:

```bash
for path in /termos.html /privacidade.html \
  /apps/literacydojo/termos.html /apps/literacydojo/privacidade.html; do
  curl -L -sS -o body.html -w '%{http_code}\n' \
    "https://aidevschool-codexdojo-os.netlify.app${path}"
  wc -c body.html
  sed -n 's:.*<title>\(.*\)</title>.*:\1:p' body.html
done
```

Esperado: HTTP 200 com conteúdo correspondente a termos ou aviso de privacidade.

Atual: HTTP 200, 608 bytes e título `codexDojo OS` em todos os caminhos.

Para validar o rollback, substituir o host por:

```text
https://6a877a6a68d0cee5f09b3934--aidevschool-codexdojo-os.netlify.app
```

O resultado permanece 200/608/`codexDojo OS`.

## Triage e recomendação

- Produto/configuração de artefato, não falha de infraestrutura: Netlify responde
  consistentemente e o site standalone serve ambos os documentos corretos.
- Manter HOLD de novos convites e aquisição.
- Não executar rollback para `6a877a6a68d0cee5f09b3934` com a intenção de
  resolver este defeito; ele é comprovadamente afetado.
- Publicar novo candidato completo contendo os documentos e links funcionais na
  jornada real; depois exigir QA independente no alias e permalink imutável.
- Gate mínimo de reteste: conteúdo/título correto, navegação a partir do
  onboarding e rodapé, retorno à jornada e ausência de escrita no estado canônico.

## Limitações

Esta revisão não emite parecer jurídico, não altera produto ou estado canônico,
não executa deploy e não comprova a jornada pedagógica, desempenho ou robustez
ampla. A evidência cobre a disponibilidade e alcançabilidade dos documentos
legais e a eficácia do rollback proposto.
