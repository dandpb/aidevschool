# Intent — AID-2673 beta hosting spike (zai-duolingo-like)

Origem: issue Paperclip **AID-2673** ("BETA ACCESS: publicar zai-duolingo-like
em URL pública para beta do founder", umbrella AID-2660 — diretiva do founder
2026-09-26). A issue manda: investigar export estático; se Prisma for
obrigatório em runtime, **propor** hospedagem adequada sem sobrescrever a
arquitetura.

## Problema

O founder precisa jogar o "Duolingo de IA" (engines/zai-duolingo-like) por URL
pública, sem setup local. A engine é Next.js 16 + Prisma/SQLite + Zustand —
as outras superfícies beta são estáticas (Netlify), esta não é.

## Resultado pretendido

1. Decisão de hospedagem embasada em spike (não em chute).
2. Runbook de deploy executável pela Platform & Release Engineer.
3. Gates verdes no caminho escolhido + screenshot de evidência.

## Desfecho (spike concluído 2026-09-26)

Export estático inviável (19 route handlers `force-dynamic`; bootstrap do jogo
depende de `/api/state`; grader server-side). Recomendado servidor Node
standalone + reverse proxy. Detalhes e evidência:
`engines/zai-duolingo-like/docs/hosting/BETA-HOSTING-SPIKE.md`.
O deploy em si é domínio da Platform & Release Engineer (child issue criada);
a decisão A/B/C ficou como `request_confirmation` na AID-2673.
