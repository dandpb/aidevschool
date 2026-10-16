# @aidevschool shared Playwright defaults

Base config (`base.config.ts`) que padroniza, para todos os agents e engines do
ecosistema, onde a evidência de browser cai e como ela é verificada.

## Onde os artefatos caem

Com o base config, tudo fica dentro do engine que roda o teste:

| Artefato | Caminho | Quando |
| --- | --- | --- |
| Screenshot automático | `<engine>/test-results/<teste>-<projeto>/test-finished-1.png` | sempre (`screenshot: "on"`) |
| Vídeo | `<engine>/test-results/<teste>-<projeto>/video.webm` | sempre (`video: "on"`) |
| Trace | `<engine>/test-results/<teste>-<projeto>/trace.zip` | só em falha |
| Screenshots explícitos de evidência | convenção do engine: `voxelDojo/game-*/.logs/*.png`, `pixelDojo/pixel-quest/shots/*.png`, `codexdojo-os-prototype/qa/*.png` | quando o spec chama `page.screenshot({ path })` |

`test-results/` é saída gerada: fica fora do source control (regra do
`AGENTS.md` raiz). Arquivos de evidência rastreados (`evidence.json`,
`evidence.ndjson`) continuam sendo a trilha de auditoria do learning gate.

## Uso pelos engines

```ts
import { defineConfig } from "@playwright/test";
import base from "../../shared/playwright/base.config";

export default defineConfig({
  ...base,
  testDir: "./playwright",
  use: { ...base.use, baseURL: "http://localhost:5175" },
  webServer: { command: "npx vite --port 5175 --strictPort", url: "http://localhost:5175" },
});
```

Engines existentes que precisam de custo menor em CI podem sobrescrever para
`"only-on-failure"` no próprio config — mas o padrão para trabalho de agente
(QA, dogfooding, evidência de gate) é captura completa.

## Verificação semântica com Jev

Screenshot e vídeo provam que a página renderizou; não provam que o conteúdo
está certo. Quando o critério de aceite é semântico (texto de feedback, tom,
pedagogia da tela), o padrão é um julgamento tipado via TypeSafe/Jev:

- Integração de referência: `learner/substrate/judgments.py`
  (`MODEL = "jev-latest"`, `https://api.typesafe.ai/v1/systemone`).
- Regras de design de perguntas (Choice/Noul/Score, state, critérios):
  `.agents/skills/typesafe-ai/SKILL.md` + docs vivos em
  `https://docs.typesafe.ai/llms.txt`.
- O produtor não verifica o próprio trabalho: quem roda o julgamento Jev sobre
  a evidência é um contexto verificador separado, como nos demais gates.
