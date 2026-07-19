# AI Literacy — bounded context

Bounded context de alfabetização em IA para pessoas não técnicas, criado pelo
plano `docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md` e registrado
no ADR `docs/design/adr/0005-ai-literacy-bounded-context.md`.

- **Público inicial:** profissionais não técnicos que querem usar IA no trabalho.
- **Promessa:** aprender a usar IA com confiança em cinco minutos por dia.
- **Formato:** microlições de 3–5 minutos, exercícios interativos, feedback
  imediato, revisão espaçada e progressão visível — PWA mobile-first.
- **Engine (Fase 1, ainda não criado):** `engines/literacyDojo/`.
- **Conteúdo canônico (Fase 0, este repositório):** `curriculum/ai-literacy/`.

O contexto reutiliza os princípios centrais do ecossistema — tentativa antes de
domínio, produtor diferente de verificador, conteúdo canônico fora da UI e
evidência auditável — mas **não** mistura o vocabulário do ensino de
programação com o da alfabetização em IA.

## Documentos do contexto

| Documento | Conteúdo |
| --- | --- |
| `content-contract.md` | `LessonDefinition`, os 7 tipos de atividade, pipeline de compilação e regras de versionamento. |
| `evidence-contract.md` | Envelope `LiteracyEvidenceRecord`, separação progresso/engajamento/competência, eventos de analytics. |
| `curriculum/ai-literacy/README.md` | Estrutura do conteúdo canônico e como validar/compilar. |

## Relação com os engines existentes

- **`codexDojo`:** pode exibir um resumo da trilha no futuro, mas não hospeda o
  player do MVP.
- **`codexdojo-os-prototype`:** pode integrar o engine pelo Engine Hub depois
  que o produto independente estiver estável.
- **`minimaxDojo`:** pode fornecer papéis de tutor e curadoria posteriormente;
  não é pré-requisito de runtime.
- **`pixelDojo` / `voxelDojo`:** compartilham princípios de evidência; o
  contrato de teaching games não muda até haver abstração comum comprovada.
- **`learner/substrate`:** pode gerar read model do catálogo e review slice
  quando houver contrato aceito; o app nunca usa `learner/learning_state.yaml`
  como banco de dados.
- **`curriculum/00_ai_in_practice/`:** trilha Nível 0 gateada (ADR-0004) do
  aprendiz único do substrato — contexto irmão, não fonte nem destino de
  conteúdo deste bounded context.

## Limites

`literacyDojo` **deve**:

- renderizar as lições e coletar tentativas;
- oferecer feedback formativo determinístico;
- persistir progresso local de experiência atrás de uma porta;
- emitir evidência estruturada (ver `evidence-contract.md`);
- funcionar sem provedor de IA e sem backend;
- ser acessível em celular e desktop.

`literacyDojo` **não deve**:

- editar `learner/learning_state.yaml` diretamente;
- declarar `mastered` com base em resposta do próprio modelo ou da UI — o termo
  é reservado a verificador independente;
- duplicar conteúdo canônico em componentes React (consome somente o read
  model gerado);
- armazenar texto livre sensível em telemetria por padrão;
- introduzir backend antes de existir hipótese validada que o exija.

## Fases

Este diretório cobre a **Fase 0** (decisão e contratos): ADR, contratos de
conteúdo e evidência, três lições piloto, validador e testes de contrato. O
engine (Fase 1), o MVP de 14 dias (Fase 2), o feedback adaptativo opcional
(Fase 3) e o piloto multiusuário (Fase 4) seguem o plano.
