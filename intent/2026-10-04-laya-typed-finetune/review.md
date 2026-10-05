# Revisão independente — fine-tuning typed-decisions

**Veredito: APTO PARA COMMIT DE PESQUISA, sem findings importantes pendentes.** Não constitui aprovação para integração ou deploy. Verificador separado: `/root/verify_live`. Escopo: scripts, dados, evidências e documentação de `docs/research/laya-jev/finetune/`, documentos pais e contrato desta mudança. Não executei modelos, inferência, treinamento ou chamadas de API; não li credenciais. Só este arquivo foi escrito pelo revisor.

## 1. Correção versus plano

Conferi intent/spec/plan, implementação e upstream Laya fixado. `freeze_encoder`, `soft-ce`, permutação de opções choice/noul e exportação são suportados pelo loop reutilizado. Duas receitas partem da mesma base oficial; quatro épocas, seed e learning rates registrados. Calibração usa somente seu split separado. A política anterior à segunda execução escolhe pelo KL mínimo na calibração, com empate v1; o seletor não lê teste ou corpus original. O mesmo split ajusta temperaturas e escolhe a receita, portanto seu resultado é tuning. O teste já consultado após v1 permanece exploratório na v2.

Os splits têm 244/98/362 casos e 316/138/410 perguntas. Conferi hashes, IDs únicos, ausência de estados e famílias idênticos entre splits e inclusão da engine pretendida em cada grupo. Intenções e frases componentes compartilhadas são explicitamente reconhecidas; não há alegação de generalização independente. O builder copiado com catalog.json para um diretório temporário reproduziu train/calibration/test e data-manifest **byte a byte, 4/4**. O corpus histórico permaneceu byte-idêntico à baseline `cf0f363d44b165487492d7cf1745139f3e33f22c`.

## 2. Testes e evidências

Executados independentemente:

- `python3 -m unittest discover -s docs/research/laya-jev -p 'test_*.py'`: **18 testes, OK**.
- `python3 -m unittest discover -s docs/research/laya-jev/finetune -p 'test_*.py'`: **10 testes, OK**.
- Os quatro analyzers de test01/test02/original01/original02 foram reexecutados em diretórios temporários a partir das evidências preservadas: **igualdade JSON integral** com as quatro summaries publicadas.
- O seletor foi reexecutado com teacher/calibração v1/v2 e política preservada: **igualdade JSON integral**; v2 selecionada por KL **0,438760405**, contra **0,503766304** da v1, nas mesmas 138 perguntas.
- Recalculei todos os totais e recortes por suite de timing-summary-01.json: contagens, médias, P50/P95 e carga coincidem exatamente com os registros. HTTP e chamadas SDK locais são identificados separadamente; a duração do aquecimento não registrada é explicitamente declarada.

Cobertura teacher validada pelo importador: train02 **244**, calibration02 **98**, test01 **362**, modelos `jev-1.13.0`, schemas e digests válidos. Cobertura das seis avaliações: **362/362** por variante no novo teste e **62/62** no original.

Resultado v2 conferido: concordância **107/410 → 183/410**, labels sintéticos **62/72 → 63/72**, KL **0,907909773 → 0,576140138**, MAE **1,026632320 → 0,777213536**. Ranking top1 **17/26 → 16/26**; top3 **21/26 → 21/26**. No histórico: labels **122/142 → 121/142**, concordância **128/220 → 129/220**, ranking top1 **0/6 → 0/6**, top3 **3/6 → 1/6**. A única mudança no estado de acerto dos 142 labels é `triage-07-pt/churn_risk`, referência false: **0,4669 → 0,5138**. A distinção entre choice explícito de engine correto e ranking por scores incorreto está documentada.

## 3. Proveniência, convenções e integridade

Confirmei a configuração-base preservada e todos os 362 registros BASE02 contra o snapshot SHA `ebf0cd524d92342a6be5e48e9fca3d7c2babfb5a56ccd79d2171ef5d8c7f7be8`. A fonte efetivamente executada na v1 confere com seu snapshot; o relatório bruto foi preservado e a finalização posterior da proveniência-base está declarada. Na v2, fonte executada, política pré-execução e receita efetiva concordam.

Li bytes dos artefatos, sem carregar modelos: pesos e configurações exportados/restaurados coincidem com os manifests em ambas as variantes. ZIPs têm tamanho/SHA publicados; manifests internos coincidem com os preservados e **todos os membros verificam seus hashes**. Peso selecionado v2: `760d6479aef421be52656431caea0a5a79099888027c92886f21d588e10393cf`; ZIP v2: `1562baae01907e22c489b3e8553e3055f605f5e2a8ae40a54a309a332e98f888`.

Revisei package_checkpoint.py e restore_adapter.py estaticamente: verificam igualdade exata de keys/dtype/shape/valores do encoder exportado, exigem camadas de decisão alteradas, validam arquivos do pacote, impedem caminhos externos e exigem SHA integral da reconstrução. Logs/manifests do produtor registram **170 tensores encoder iguais**, **31 tensores não-encoder alterados**, **36 incluídos**. Não repeti a comparação tensorial pesada; conferi a lógica, evidências e hashes integrais dos artefatos/restaurações.

Não há alterações em gates, learner, backend ou recibos de produção. Binários permanecem fora do Git. README/REPORT/RESUME pais apontam para a continuação e distinguem baseline auto anterior de typed-decisions. A simplificação preservou contratos e dados; fixtures de análise são versionáveis, sem dependência de scratch/rede. Após a regeneração/staging pelo produtor, executei `sha256sum -c --quiet SHA256SUMS.txt`: **140 artefatos, exit code 0**.

## 4. Segurança e higiene

Scan textual dos arquivos finetune/evidence/fontes/documentação, exibindo somente contagens: **zero candidatos de credencial**. Não li `.env`, secrets ou valores de chave. Os coletores mascaram a chave em erros; exemplos são sintéticos. O relatório distingue imitação de teacher de ground truth, head+calibração de efeito isolado dos pesos, tuning de avaliação independente e latência HTTP de computação no mesmo hardware. Também declara ausência de teste E2E na interface e não recomenda trocar Jev pela variante.

## Findings encontrados e encerrados

1. Importação aceitava teacher de modelo/split divergentes enquanto exportava identidade fixa. Reproduzido com 244 registros alterados em tempfile; corrigido com verificação estrita e negativos.
2. Analyzer não conferia configuração da BASE, embora temperaturas possam alterar scores/rankings com pesos iguais. Reproduzido com 362 config hashes fictícios; corrigido com âncora de configuração/linhagem e negativos.
3. Reprodutibilidade dependia de catálogo e fixtures exclusivos de scratch. Catálogo e fixtures foram preservados localmente no pacote; testes e builder reproduzem em isolamento.

O produtor também detectou e corrigiu o draft com associação errada de índice de engine, com teste anterior à correção. Draft/targets antigos não entram nas métricas finais. **Nenhum finding material permanece aberto.** O resultado sustenta aproximação exploratória ao teacher, com regressões documentadas; não sustenta equivalência ou substituição de produção.
