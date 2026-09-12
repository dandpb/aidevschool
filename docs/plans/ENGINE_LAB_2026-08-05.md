# Engine Lab — ambiente comparativo das engines

| Campo | Decisão |
| --- | --- |
| Patrocinador | CEO |
| Dono de entrega | Founding Product Engineer |
| Superfície | Engine Hub secundário em `engines/codexdojo-os-prototype/desktop` |
| Objetivo | Executar e comparar engines por papel e evidência para informar decisões de portfólio |
| Não objetivo | Eleger automaticamente uma vencedora, declarar release, aprendizagem ou mastery |

## Resultado implementado

O Engine Hub reúne runtimes web isolados e ações locais allowlisted sem criar um
workspace Node na raiz. Ele agora inclui codexDojo, LiteracyDojo, miniTown,
dojoToday, PixelDojo, o catálogo voxelDojo e os cartões locais de minimaxDojo,
MiniMax Evolution Engine e OpenClaw. Cada engine mantém diretório, gerenciador de
pacotes, porta, autoridade e suíte próprios.

Topologia de teste: OS `4174`, codexDojo `5175`, Pixel `5176`, voxel `5177` e
`5202–5218`, Literacy `5178`, miniTown `5179`, dojoToday `5180`.

## Como acessar

Instale as dependências engine a engine conforme seus `README.md` e execute:

```bash
cd engines/codexdojo-os-prototype
npm run engine-lab
```

Abra `http://127.0.0.1:4174/desktop`, clique em **Atividades**, procure por
**Engine Hub** e selecione o motor. O painel de cada engine explica objetivo,
comando standalone e foco da avaliação. `Ctrl+C` encerra somente os processos
abertos pelo launcher. `npm run engine-lab:smoke` executa o contrato de browser.

| Engine | Como funciona | Objetivo avaliado |
| --- | --- | --- |
| codexDojo | Dashboard web read-only para agentes, projetos e prompts | Orientar contribuidores sem virar uma segunda entrada do aprendiz |
| LiteracyDojo | Microlição determinística com tentativa, feedback, dica, retry e evidência | Ensinar pessoas não técnicas a usar e conferir IA |
| miniTown | Vila 3D explore-only, sem escrita no estado do aprendiz | Testar orientação e confiança antes da primeira missão |
| dojoToday | Projeção diária derivada do substrate | Mostrar a próxima prática relevante ao programador |
| PixelDojo | Mecânicas 2D que representam conceitos de programação | Testar compreensão e transferência com evidência bruta |
| voxelDojo | Catálogo de simulações 3D operáveis | Testar conceitos de estruturas e sistemas espacialmente |
| minimaxDojo | Núcleo de tutoria exercitado por ação local fixa | Melhorar feedback socrático sem antecipar solução |
| MiniMax Evolution Engine | Supervisor de fases de produção | Manter produção e verificação separadas e auditáveis |
| OpenClaw | Preview/runner de checklist baseado em arquivos | Tornar o ciclo reproduzível sem autoridade semântica indevida |

## Regra de comparação

Uma nota exige artefato, comando reproduzível, resultado datado e revisor.
`NE` significa não evidenciado; `NA`, fora do papel declarado. Nunca converter
`NE` em zero.

Atividades avaliadas precisam passar antes pelos gates eliminatórios:

1. tentativa antes da solução;
2. produtor diferente do verificador;
3. nenhuma escrita ou alegação falsa de mastery;
4. evidência vinculada à identidade e versão;
5. falha fechada para payload, receipt e indisponibilidade;
6. ausência de texto livre ou PII desnecessária em evidência/analytics.

## Rubrica 0–4

| Dimensão | Peso | Evidência mínima |
| --- | ---: | --- |
| Integridade pedagógica | 20% | tentativa, feedback específico, dica progressiva e retry |
| Integridade de evidência | 20% | envelope, digest, receipt independente e mismatch/outage |
| Valor e transferência | 15% | tarefa equivalente nova avaliada cegamente |
| Ativação | 10% | tempo até primeira ação e primeiro feedback |
| Adequação ao público | 10% | sessão representativa sem assistência do produtor |
| Acessibilidade | 10% | teclado, foco, contraste, movimento e fallback gráfico |
| Privacidade | 10% | inspeção de rede/storage, allowlists, retenção e consentimento |
| Custo operacional | 5% | instalação, duração, flakiness, serviços e footprint |

Escala: 0 contradiz o requisito; 1 é protótipo; 2 é fluxo local com lacunas; 3
é fluxo completo verificado no papel declarado; 4 exige observação com
aprendizes e revisão independente.

miniTown é comparada como exploração, não microlição. Engines internas são
avaliadas pela contribuição ao fluxo learner-facing, não por UX. Pixel e Voxel
só são comparáveis diretamente quando ensinam o mesmo conceito ao mesmo público.

## Evidência e decisão

O smoke do OS deve abrir todas as superfícies, operar os caminhos representativos
e registrar artefatos compatíveis com
`engines/codexdojo-os-prototype/docs/engine-lab-run.schema.json`. O hash do estado
canônico antes e depois deve permanecer idêntico. Screenshots, traces e JSON de
execução ficam em `test-results/` e não são fonte canônica.

Build verde prova operabilidade, não relevância. Uma decisão `investir`,
`manter`, `incubar` ou `congelar` requer sessões comparáveis, revisão independente
e aprovação do CEO para mudar o contrato de portfólio.

## Bloqueios conhecidos do primeiro run

- O host atual não possui todas as bibliotecas nativas necessárias ao Chromium.
- dojoToday documenta um `gen:today` inexistente; o build real usa o substrate.
- miniTown e voxelDojo não têm preview de build unificado; o laboratório usa
  servidores Vite em portas explícitas.
- Engines locais precisam de cartões CLI read-only, não iframes.
