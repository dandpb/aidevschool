# Trilha `ai-literacy` — conteúdo canônico

Trilha de alfabetização em IA para pessoas não técnicas, dentro do currículo
compartilhado (ver ADR `docs/design/adr/0005-ai-literacy-bounded-context.md` e
os contratos em `docs/design/ai-literacy/`). É uma **trilha nova**, não uma
cópia de currículo: os projetos numerados (`01_`…`18_`) e a trilha Nível 0
(`00_ai_in_practice/`, gate no-code do aprendiz único) continuam intocados.

- **Público:** profissionais não técnicos que querem usar IA no trabalho.
- **Escopo público:** 14 microlições de 3–5 minutos em 4 módulos da jornada
  `ia_pratica`; conteúdo em pt-BR.
- **Prévia Dev:** 3 lições válidas no módulo `mod-05`, classificadas como
  jornada `dev`; ficam preservadas no catálogo, mas não entram no read model
  público enquanto a Trilha Dev estiver “Em breve”.
- **Consumidora:** `engines/literacyDojo/`, que
  consome **somente o read model tipado gerado** — nunca estes YAMLs direto.
- **Estado do conteúdo:** 17/17 lições estão `ready` no catálogo: 14 públicas e
  3 da prévia Dev. Esse status prova validade de conteúdo, não release do app
  nem domínio do aprendiz.

## Estrutura

```text
curriculum/ai-literacy/
├── README.md              # este arquivo
├── catalog.yaml           # índice canônico: jornadas, skills, módulos, 17 lições
├── schemas/
│   ├── lesson.schema.json # contrato LessonDefinition
│   └── rubric.schema.json # contrato de rubrica verificável
├── modules/
│   ├── 01-ai-sem-misterio/       # lições l01–l03
│   ├── 02-pedir-bem/             # lições l04–l07
│   ├── 03-avaliar-e-verificar/   # lições l08–l11
│   ├── 04-seguranca-e-aplicacao/ # lições l12–l14
│   └── 05-dev-contexto-e-escolha/ # prévia Dev l15–l17, fora do app público
└── tools/
    ├── validate.py      # validador + compilador do read model
    └── tests/           # testes de contrato (unittest; descobertos pelo pytest)
```

## Como validar

```bash
python3 curriculum/ai-literacy/tools/validate.py
```

Exit code `0` com conteúdo válido; `1` com mensagens claras em caso inválido —
conteúdo inválido falha o build, sem fallback silencioso.

## Como compilar o read model (TypeScript)

```bash
python3 curriculum/ai-literacy/tools/validate.py --compile engines/literacyDojo/src/data/generated
```

Gera `<outdir>/lessons.ts` com cabeçalho `DO NOT EDIT BY HAND`, os tipos
`LessonDefinition` + union de atividades e somente os 4 módulos/14 lições
`ready` da jornada `ia_pratica`. A jornada `dev` continua canônica, mas não é
projetada no LiteracyDojo público. Lições `planned` não entram em `lessons`,
mas podem permanecer no índice do módulo com `hasContent: false`; elas não
exigem arquivo próprio.

## Como rodar os testes

```bash
python3 -m unittest discover -s curriculum/ai-literacy/tools/tests -t .
```

## Regras de edição (resumo; contrato completo em `docs/design/ai-literacy/content-contract.md`)

- IDs são estáveis (`l01`…`l17`, `mod-01`…`mod-05`, skills em kebab-case) e
  nunca dependem do título exibido.
- Todo módulo declara `journey: ia_pratica | dev`; somente `ia_pratica` compõe
  o percurso público deste release.
- Toda alteração de conteúdo incrementa `version` da lição.
- `catalog.yaml` e o arquivo da lição devem concordar em módulo, título,
  duração, pré-requisitos e skills — o validador acusa divergência.
- Lição `ready` exige arquivo válido; lição com arquivo exige `status: ready`.
- Nenhum conteúdo pode declarar `mastered`: o termo é reservado a um futuro
  verificador independente (ver `docs/design/ai-literacy/evidence-contract.md`).
