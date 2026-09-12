# AID-169 — QA executivo final da cadeia do piloto

**Observação UTC:** 2026-08-25  
**Papel:** QA Lead independente  
**Aplicações:** CodexDojo OS + superfície LiteracyDojo do bundle do piloto  
**Disposição:** **NO-GO / HOLD para release e convites**  
**Severidade:** gate crítico de release; nenhum novo defeito funcional local encontrado

## Resultado executivo

O artefato local corrigido continua apto a **gerar** um novo candidato: o gate do
bundle, o build integrado e o fluxo focado do LiteracyDojo passaram nesta
reexecução independente. Isso não torna o piloto pronto para release.

O candidato público anteriormente aprovado está associado ao SHA
`3586cb587092abea2c4881b2f6a8b926e9487921` e ao deploy imutável
`6a8c366553da9a55fed22b04`, mas esse candidato reproduziu o defeito legal
documentado em AID-140/AID-143. A correção legal só existe no artefato local.
Ainda não há novo deploy/permalink imutável correlacionado à correção, nem smoke
independente no permalink e alias. O rollback anterior
`6a877a6a68d0cee5f09b3934` também reproduz o defeito legal e não o mitiga.

Além disso, as confirmações executivas para criar o novo candidato
(`1a56c80a-e59e-4238-beae-57c4470d23ac`; a duplicata anterior
`ace557f6-df9a-40b5-b118-9d68c8dbcbf1`) e para aprovar o protocolo de feedback
(`35fd67c0-3706-4e12-9ca2-4ba98f9000d9`) permanecem `pending` em 2026-08-25.
Logo, não há autorização para deploy, convite ou coleta com participantes.

## Charters de risco e evidência

| Risco | Evidência independente | Resultado |
| --- | --- | --- |
| Bundle incompleto/adulterado é promovido | `npm run test:pilot-bundle` | PASS, 11/11; inclui documentos legais, SW escopado e adulteração pós-manifesto |
| Correção não compila no bundle integral | `npm run build:pilot` | PASS; OS, LiteracyDojo e três superfícies developer construídas; 17 lições validadas |
| Links legais regressam no fluxo | `npm run test -- --run tests/app/appFlow.test.tsx` | PASS, 7/7 |
| Release perde correlação imutável | AID-122/AID-123 versus AID-140/AID-146 | FAIL de gate: correção ainda não tem novo SHA/deploy/permalink público verificado |
| Rollback mitiga incidente legal | AID-140/AID-143 | FAIL como mitigação: deploy anterior também afetado |
| Feedback coleta dados indevidos ou antecipa recrutamento | revisão de `FIRST_PILOT_FEEDBACK_PROTOCOL.md` | desenho privacy-safe, sem texto livre/PII e sem writes; aprovação do CEO ainda pendente |

Ambiente: Linux do workspace compartilhado, HEAD local
`9d4b744526891335f0749f77db0f151b2c7ed8b7`, Node/npm instalados no checkout.
O workspace já continha alterações de múltiplas entregas; esta QA não as
modificou como produto e não alterou estado canônico do learner.

## Critérios objetivos para sair do HOLD

1. CEO aceitar a confirmação mais recente de AID-140 para criar somente o novo
   candidato.
2. Owner de release publicar o bundle corrigido, registrar SHA e deploy/permalink
   imutáveis e nomear uma estratégia de rollback que não retorne ao defeito legal.
3. QA independente verificar alias e permalink: identidade, documentos legais,
   rotas críticas, jornada, ausência de falso mastery e ausência de escrita em
   learner.
4. CEO aceitar o protocolo AID-142, nomeando moderador, revisor e armazenamento,
   antes de qualquer convite.

## Reconciliação do board

As issues antigas abaixo foram operacionalmente substituídas por entregas com
evidência concluída. O CEO pode encerrá-las como `done`/superseded, preservando
links históricos, sem reabrir implementação:

| Issue antiga | Entrega substituta concluída |
| --- | --- |
| AID-33 e AID-46 | AID-59, AID-60, AID-79, AID-88 e AID-95 (CI bloqueante e QA) |
| AID-34, AID-47 e AID-105 | AID-121 (integração), AID-122 (QA) e AID-123 (correlação/rollback) |
| AID-35 e AID-48 | AID-122, AID-123 e AID-141 (validação, identidade e smoke independente) |
| AID-36 | AID-49 (decisão executiva do candidato antigo), agora superada pelo HOLD de AID-140/AID-169 |

AID-150 também pode ser encerrada como `done`: reconciliou o gate legal local e
retomou AID-140 até a confirmação executiva. **Não** encerrar AID-140 nem AID-142:
ambas mantêm gates reais pendentes. AID-169 encerra como `done` com NO-GO; uma
nova QA deve nascer somente após existir novo candidato público autorizado.

## Limitações

Não houve deploy, convite ou teste com participante. Não foi emitido parecer
jurídico sobre o texto dos documentos. Os checks locais não comprovam
disponibilidade pública futura, eficácia pedagógica, mastery ou robustez geral.
