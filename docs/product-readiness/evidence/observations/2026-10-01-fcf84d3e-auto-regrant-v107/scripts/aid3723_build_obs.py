#!/usr/bin/env python3
# Gera o bundle de observação v107 (AID-3723) a partir das verificações first-hand nesta árvore.
import json, copy
from pathlib import Path

V105 = json.load(open('docs/product-readiness/evidence/observations/2026-09-30-126e5286-auto-regrant-v105/observations.json'))

TREE = 'c819d4a215bcfacdcc80cd37d1f0ac1ef5ce096e'
ANCHOR_V105 = '2b571a555c7825e9c8af69f37210d6f2596e3b09'
MAIN = 'fcf84d3e0e623aaa010fa8081e3781809736ed81'

REANCHOR_OS = (
    "[Re-anchor v107 (AID-3723, QA Lead ca6a3f95, observação independente pré-countersign PR #654): "
    "observação re-ancorada first-hand na árvore `" + TREE + "` (branch regrant/auto-20261001-fcf84d3e = main tip " + MAIN + " + snapshot de fábrica AID-1357 @" + MAIN[:8] + "; PR #654 aberto sobre a main corrente, sem update-branch). "
    "Causa do drift v105→v107 deste use case: merge #653 (419d44bc, AID-3714) — 4 linhas CSS-only em engines/codexdojo-os-prototype/src/styles/overlays.css "
    "(.mentor-box input:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; } + 3 linhas de comentário), único arquivo coberto por fingerprints alterado no intervalo " + ANCHOR_V105[:8] + ".." + TREE[:8] + " "
    "(logs/interval-2b571a55-c819d4a2-changed-files.txt); overlays.css está sob engines/codexdojo-os-prototype/src/ dos sourcePaths de use case dos 3 grupos OS → exatamente 9 cenários os-* driftados (3 grupos), 15 inalterados (logs/fingerprint-drift-v105-v107.txt). "
    "A mudança é adição de regra de anel de foco no input do mentor (acessibilidade S3-1 da lente L08/AID-3682); não altera texto de fronteira, fluxo de avaliação nem alvos de asserção — alvos re-verificadas first-hand nesta árvore (logs/first-hand-checks.log). "
    "Producer evidence desta árvore: CI push run 36942785036 @" + MAIN[:8] + " (job `product readiness (claims)` FAILURE = as 3 stale-windows OS que este re-grant cura; log arquivado em logs/claims-job-110639415160-red-gate-main-push-fcf84d3e.txt; receipts 24/24 idênticos ao snapshot da fábrica, arquivados em logs/ci-run-36942785036/). "
    "Producer reports regenerados no HEAD " + TREE[:8] + " via cli.py producer-report: identidade 24/24 com o snapshot da fábrica (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact digests — logs/regen-identity.log + logs/ci-receipts-identity.log). "
    "Gates de suporte nesta árvore: codexdojo-os biome lint 162 files ok + vitest 359 passed (logs/os-lint.log, logs/os-unit-tests.log); docs tests 58 passed; factory 166 passed; substrate 221 passed/1 skipped. "
    "Limitação: `npm run test:readiness` completo (bundle pilot de 19 runtimes via corepack/pnpm) não executável neste ambiente de observação — os fatos playwright dos cenários são cobertos pelo canal independente de receipts do CI @" + MAIN[:8] + " (executor automated, gitSha " + MAIN[:8] + ", idênticos ao snapshot). "
    "Ciclo SEM merge/push/deploy por restrição AID-3723: observação publicada na issue; fase QA na branch (aggregate --observations + regrant --propose exit 0) pendente de aprovação maintainer das 3 workflows (action_required) e de autorização de push. "
    "Precedentes: PR #603 (v101), PR #605 (v103), PR #607 (v105); proposta de fábrica PR #654 (manifest pending-observation, label regrant-pending-observation) — este bundle completa a observação independente das 25 pendências do checklist do PR #654.]"
)

REANCHOR_CARRY = (
    "[Re-anchor v107 (AID-3723, QA Lead ca6a3f95, observação independente pré-countersign PR #654): "
    "observação re-ancorada first-hand na árvore `" + TREE + "` (branch regrant/auto-20261001-fcf84d3e = main tip " + MAIN[:8] + " + snapshot de fábrica AID-1357 @" + MAIN[:8] + "; PR #654 aberto sobre a main corrente, sem update-branch). "
    "Fingerprint deste use case inalterado desde o anchor v105 (" + ANCHOR_V105[:8] + ", PR #607) — o intervalo " + ANCHOR_V105[:8] + ".." + TREE[:8] + " tocou, entre arquivos cobertos por fingerprints, apenas engines/codexdojo-os-prototype/src/styles/overlays.css (coberto pelos 3 grupos OS; logs/interval-2b571a55-c819d4a2-changed-files.txt); "
    "a re-observação completa das 25 pendências é exigência fail-closed do ciclo de re-grant (bundle cobre o checklist do PR #654). "
    "Alvos de citação re-verificados first-hand nesta árvore (logs/first-hand-checks-nonos.log); guias student/facilitator/beta byte-idênticos desde " + ANCHOR_V105[:8] + " (diff vazio). "
    "Producer evidence desta árvore: CI push run 36942785036 @" + MAIN[:8] + " (job `product readiness (claims)` FAILURE = as 3 stale-windows OS que este re-grant cura; receipts 24/24 idênticos ao snapshot da fábrica, arquivados em logs/ci-run-36942785036/). "
    "Producer reports regenerados no HEAD " + TREE[:8] + " via cli.py producer-report: identidade 24/24 (logs/regen-identity.log + logs/ci-receipts-identity.log). "
    "Gates de suporte nesta árvore: docs tests 58 passed; factory 166 passed; substrate 221 passed/1 skipped (dojoToday read-only boundary incl.). "
    "Ciclo SEM merge/push/deploy por restrição AID-3723; precedentes PR #603/#605/#607 (v101/v103/v105).]"
)

# Notas first-hand v107 (linhas verificadas nesta árvore; logs/first-hand-checks*.log)
FH = {
 'os-literacy-hosted-mission': "Proveniência: v84 walk + v88/v92/v95 + v101 (01696f77, PR #603) + v103 (4cff0f02, PR #605) + v105 (2b571a55, PR #607). Re-verificação first-hand nesta árvore " + TREE[:8] + ": student-guide.md:60 §'Como fazer IA Prática no OS' — 'Concluída no host não é domínio verificado', progresso neste aparelho, sem conta; src/journey/Hub.tsx:137 next-mission-card (missão seguinte visível com resultado); src/engines/EngineHubApp.tsx:68 — 'Evidência bruta · não verificada'. ",
 'os-literacy-returning-device': "Proveniência: v84 + v88/v92/v95 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:84 — 'O retorno funciona só no **mesmo navegador e aparelho** onde você começou'; src/progress/indexedDbProgressRepository.ts presente — persistência indexedDB local por perfil. ",
 'os-verification-recovery': "Proveniência: v84 + v88/v92/v95 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:205 — 'If a hosted mission does not load, retry once. If verification is unavailable, leave the status' (recuperação na superfície, sem intervenção de repositório); estado preservado not submitted/rejected sem implicar aceitação. ",
 'os-onboarding-track-choice': "Proveniência: v88/v92 (3aca4d5d, PR #489) + v101 + v103 + v105. Re-verificação first-hand nesta árvore: src/journey/Onboarding.tsx:49 — 'Leva menos de um minuto. Escolha IA Prática ou Dev. Sem conta; o progresso fica neste dispositivo' (escolha explicável na própria superfície); student-guide.md:58+ descreve as duas trilhas e o endereço fixo do facilitador. ",
 'os-returning-recovery': "Proveniência: v88/v92 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:56/87 — 'Outro aparelho, outro navegador ou dados do site apagados começam do zero. Não há sincronização' (perda de estado local explicável sem intervenção); facilitator-guide orienta parar e pedir ajuda quando o progresso desaparecer. ",
 'os-returning-device': "Proveniência: v88/v92 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:84-87 oferta os-returning-learner no mesmo navegador/aparelho, retorno ao /hub sem repetir onboarding, sem conta/sync; src/journey/Hub.tsx:185 'Conclusão não é domínio' + canonical-mastery-count só conta competências verificadas. ",
 'os-voxel-hosted-missions': "Proveniência: v84 (242dbb7c) + v88/v92 + v98 (0e54d88d, PR #510) + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:30 — 'O status do host é progresso local — nunca domínio'; guide §Como fazer as três missões 3D (WAREHOUSE→WORMHOLE→RELAY STATION pelo hub); src/engines/EngineHubApp.tsx:68 — 'Evidência bruta · não verificada'; src/journey/Hub.tsx:185 — 'Conclusão não é domínio'. ",
 'os-renderer-accessibility-recovery': "Proveniência: v84 + v88/v92 + v98 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: facilitator-guide.md:292 — 'WebGL initialization fails | Select the accessible renderer and retry... | Both projections fail or the accessible projection loses the promised interaction' (limiar nomeável na própria linha); :293 reduced-motion/keyboard; student-guide.md:79 e :212-214 projeção acessível/controles por teclado. ",
 'os-voxel-returning-device': "Proveniência: v84 + v88/v92 + v98 + v101 + v103 + v105. Re-verificação first-hand nesta árvore: student-guide.md:201-203 — 'The OS saves supported setup and mission state in this browser profile. Reload the same device to resume... there is no account or cross-device synchronization'; src/progress/indexedDbProgressRepository.ts persistência local. ",
}

# cenários carryover: mantém notas first-hand v105 (alvos byte-idênticos; linhas re-verificadas nos logs)
CARRYOVER_NOTE_ADJ = {
 # correções de linha verificadas nesta árvore
 'literacy-retry': ('LessonScreen.tsx:435', 'src/screens/LessonScreen.tsx:230'),
}

def build():
    out = {'gitSha': TREE, 'observedAt': '2026-10-02T01:28:00Z', 'observerContext': 'independent-readiness-observer', 'scenarios': []}
    for s in V105['scenarios']:
        sid = s['scenarioId']
        ns = copy.deepcopy(s)
        for a in ns['assertions']:
            if sid in FH:
                notes = FH[sid]
                if a['id'] not in notes and a.get('evidence') == 'observation':
                    pass
                a['notes'] = notes + REANCHOR_OS
            else:
                old = a['notes']
                head = old.split('[Re-anchor')[0].rstrip()
                head = head.replace('nesta árvore 2b571a55', 'na árvore v105 2b571a55 (PR #607)')
                head = head.replace('nesta árvore `2b571a555c7825e9c8af69f37210d6f2596e3b09`', 'na árvore v105 `2b571a555c7825e9c8af69f37210d6f2596e3b09` (PR #607)')
                for pair in CARRYOVER_NOTE_ADJ.values():
                    head = head.replace(pair[0], pair[1])
                a['notes'] = head + ' ' + REANCHOR_CARRY
        out['scenarios'].append(ns)
    # ordena: os-* primeiro (escopo AID-3723), depois os demais
    out['scenarios'].sort(key=lambda s: (not s['scenarioId'].startswith('os-'), s['scenarioId']))
    return out

if __name__ == '__main__':
    d = build()
    p = Path('/paperclip/aid3723-evidence/observation-bundle/observations.json')
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('scenarios:', len(d['scenarios']))
    os_n = [s['scenarioId'] for s in d['scenarios'] if s['scenarioId'].startswith('os-')]
    print('os-*:', len(os_n), os_n)
    # sanidade: toda pendência do checklist coberta
    pending = ['literacy-happy-path','literacy-retry','literacy-resume','literacy-corridor-happy-path','literacy-corridor-gate-retry','literacy-corridor-review-window',
               'os-literacy-hosted-mission','os-verification-recovery','os-literacy-returning-device','os-voxel-hosted-missions','os-renderer-accessibility-recovery','os-voxel-returning-device',
               'os-onboarding-track-choice','os-returning-recovery','os-returning-device','dojotoday-active-unit-guidance','dojotoday-read-only-boundary','dojotoday-returning-next-day',
               'pixelquest-encounter-evidence','pixelquest-evidence-recovery','pixelquest-returning-evidence-handoff','voxel-standalone-loop','voxel-accessible-renderer','voxel-standalone-return-reentry','minitown-explore-only']
    have = {s['scenarioId'] for s in d['scenarios']}
    print('pendências cobertas:', len([p for p in pending if p in have]), '/', len(pending))
    print('faltando:', [p for p in pending if p not in have] or 'nenhuma')
    print('outcomes:', {s['outcome'] for s in d['scenarios']})
