#!/usr/bin/env python3
# Gera o bundle de observação v107-r1 (AID-3723) — 9 observações NOVAS + 16 CARRYOVERS distintos,
# janela real, PR head vs merge ref explicitados, producer-evidence não apresentada como observação.
import json, copy

V105 = json.load(open('docs/product-readiness/evidence/observations/2026-09-30-126e5286-auto-regrant-v105/observations.json'))

TREE = 'c819d4a215bcfacdcc80cd37d1f0ac1ef5ce096e'      # PR #654 HEAD (branch regrant/auto-20261001-fcf84d3e)
MERGE_REF = '191b53192061629c2b2f6b01b8c01a04634022d5' # refs/pull/654/merge (GitHub test-merge)
TREE_ID = 'c6c546b8df54ea013632ff60b6d6c11c2d93ed25'   # árvore comum head==merge-ref (verificado 2026-10-02T01:52Z)
ANCHOR_V105 = '2b571a555c7825e9c8af69f37210d6f2596e3b09'
MAIN = 'fcf84d3e0e623aaa010fa8081e3781809736ed81'

WINDOW = (
    "Janela real do drift: resultados promovidos v105 (árvore `" + ANCHOR_V105 + "`, PR #607) → PR head `" + TREE + "`; "
    "único arquivo coberto por fingerprints alterado na janela: engines/codexdojo-os-prototype/src/styles/overlays.css (+4 linhas CSS-only, commit 419d44bc do merge #653/AID-3714) — logs/interval-2b571a55-c819d4a2-changed-files.txt. "
    "Geometria: PR head `" + TREE[:8] + "` e merge ref `refs/pull/654/merge` = `" + MERGE_REF[:8] + "` são commits distintos com árvore idêntica `" + TREE_ID + "` (verificado 1º-mão em 2026-10-02T01:52Z via git rev-parse <tree>); "
    "a observação foi executada na árvore do PR head — byte-a-byte a mesma árvore que o gate avalia no merge ref. "
)

PRODUCER_CHAN = (
    "Producer evidence (canal de fatos playwright do produtor — NÃO é observação independente e não fundamenta asserção de observação): "
    "CI push run 36942785036 @" + MAIN[:8] + " (job `product readiness (claims)` FAILURE = as 3 stale-windows OS que este re-grant cura; log arquivado; receipts 24/24 idênticos ao snapshot da fábrica, logs/ci-run-36942785036/). "
    "Producer reports regenerados no PR head " + TREE[:8] + " via cli.py producer-report: identidade 24/24 com o snapshot da fábrica e com os receipts do CI (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact digests — logs/regen-identity.log + logs/ci-receipts-identity.log). "
)

SUPPORT = (
    "Gates de suporte nesta árvore: codexdojo-os biome lint 162 files ok + vitest 359 passed; docs tests 58 passed; factory 166 passed; substrate 221 passed/1 skipped. "
    "Limitação: `npm run test:readiness` completo (bundle pilot de 19 runtimes via corepack/pnpm) não executável no ambiente de observação — fatos playwright cobertos apenas pelo canal de receipts do CI (producer). "
)

TAG_NEW = "[NOVA OBSERVAÇÃO v107 — first-hand QA Lead ca6a3f95 (AID-3723), escopo nominal dos 3 grupos OS stale pós-#653; estas 9 observações são novas nesta janela.] "
TAG_CARRY = "[CARRYOVER v107 — re-verificação de manutenção, NÃO é observação nova: fingerprint do use case inalterado desde v105 e alvos de citação byte-idênticos; a observação nova v107 cobre apenas os 9 cenários os-* driftados. Mantida como pendência fail-closed do checklist do PR #654.] "

REANCHOR_OS = (
    "[Re-anchor v107 (AID-3723, QA Lead ca6a3f95, observação independente pré-countersign PR #654): "
    "observação executada first-hand na árvore do PR head `" + TREE + "` (branch regrant/auto-20261001-fcf84d3e = main tip " + MAIN[:8] + " + 1 commit de snapshot de fábrica AID-1357; PR #654 aberto sobre a main corrente, sem update-branch; merge ref distinto com árvore idêntica — vide janela abaixo). "
    + WINDOW +
    "overlays.css está sob engines/codexdojo-os-prototype/src/ dos sourcePaths de use case dos 3 grupos OS → exatamente 9 cenários os-* driftados (3 grupos), 15 inalterados (logs/fingerprint-drift-v105-v107.txt). "
    "A mudança é adição de regra de anel de foco no input do mentor (acessibilidade S3-1 da lente L08/AID-3682); não altera texto de fronteira, fluxo de avaliação nem alvos de asserção — alvos re-verificados first-hand nesta árvore (logs/first-hand-checks.log, 14/14 PASS). "
    + PRODUCER_CHAN + SUPPORT +
    "Ciclo SEM merge/push/deploy pelo QA (esclarecimento PO1965099e + CEO15aa1999: push limitado dos artefatos no PR #654 cabe apenas ao produtor/dono legítimo da branch; bundle imutável entregue com hash). "
    "Precedentes: PR #603 (v101), PR #605 (v103), PR #607 (v105); proposta de fábrica PR #654 (manifest pending-observation, label regrant-pending-observation) — este bundle cobre as 25 pendências do checklist do PR #654 (9 novas + 16 carryovers).]"
)

REANCHOR_CARRY = (
    "[Re-anchor v107 (AID-3723, QA Lead ca6a3f95, observação independente pré-countersign PR #654): "
    "carryover re-verificado na árvore do PR head `" + TREE + "` (branch regrant/auto-20261001-fcf84d3e = main tip " + MAIN[:8] + " + snapshot de fábrica; merge ref distinto com árvore idêntica — vide janela abaixo). "
    + WINDOW +
    "Fingerprint deste use case inalterado desde o anchor v105 (" + ANCHOR_V105[:8] + ", PR #607); alvos de citação re-verificados first-hand nesta árvore (logs/first-hand-checks-nonos.log, 25/25 PASS); guias student/facilitator/beta byte-idênticos desde " + ANCHOR_V105[:8] + " (diff vazio). "
    + PRODUCER_CHAN + SUPPORT +
    "Ciclo SEM merge/push/deploy pelo QA (esclarecimento PO1965099e + CEO15aa1999); precedentes PR #603/#605/#607 (v101/v103/v105).]"
)

FH = {
 'os-literacy-hosted-mission': "Proveniência da série: v84 walk + v88/v92/v95 + v101 (01696f77, PR #603) + v103 (4cff0f02, PR #605) + v105 (2b571a55, PR #607). NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:60 §'Como fazer IA Prática no OS' — 'Concluída no host não é domínio verificado', progresso neste aparelho, sem conta; src/journey/Hub.tsx:137 next-mission-card (missão seguinte visível com resultado); src/engines/EngineHubApp.tsx:68 — 'Evidência bruta · não verificada'. ",
 'os-literacy-returning-device': "Proveniência da série: v84 + v88/v92/v95 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:84 — 'O retorno funciona só no **mesmo navegador e aparelho** onde você começou'; src/progress/indexedDbProgressRepository.ts presente — persistência indexedDB local por perfil. ",
 'os-verification-recovery': "Proveniência da série: v84 + v88/v92/v95 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:205 — 'If a hosted mission does not load, retry once. If verification is unavailable, leave the status' (recuperação na superfície, sem intervenção de repositório); estado preservado not submitted/rejected sem implicar aceitação. ",
 'os-onboarding-track-choice': "Proveniência da série: v88/v92 (3aca4d5d, PR #489) + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): src/journey/Onboarding.tsx:49 — 'Leva menos de um minuto. Escolha IA Prática ou Dev. Sem conta; o progresso fica neste dispositivo' (escolha explicável na própria superfície); student-guide.md:58+ descreve as duas trilhas e o endereço fixo do facilitador. ",
 'os-returning-recovery': "Proveniência da série: v88/v92 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:56/87 — 'Outro aparelho, outro navegador ou dados do site apagados começam do zero. Não há sincronização' (perda de estado local explicável sem intervenção); facilitator-guide orienta parar e pedir ajuda quando o progresso desaparecer. ",
 'os-returning-device': "Proveniência da série: v88/v92 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:84-87 oferta os-returning-learner no mesmo navegador/aparelho, retorno ao /hub sem repetir onboarding, sem conta/sync; src/journey/Hub.tsx:185 'Conclusão não é domínio' + canonical-mastery-count só conta competências verificadas. ",
 'os-voxel-hosted-missions': "Proveniência da série: v84 (242dbb7c) + v88/v92 + v98 (0e54d88d, PR #510) + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:30 — 'O status do host é progresso local — nunca domínio'; guide §Como fazer as três missões 3D (WAREHOUSE→WORMHOLE→RELAY STATION pelo hub); src/engines/EngineHubApp.tsx:68 — 'Evidência bruta · não verificada'; src/journey/Hub.tsx:185 — 'Conclusão não é domínio'. ",
 'os-renderer-accessibility-recovery': "Proveniência da série: v84 + v88/v92 + v98 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): facilitator-guide.md:292 — 'WebGL initialization fails | Select the accessible renderer and retry... | Both projections fail or the accessible projection loses the promised interaction' (limiar nomeável na própria linha); :293 reduced-motion/keyboard; student-guide.md:79 e :212-214 projeção acessível/controles por teclado. ",
 'os-voxel-returning-device': "Proveniência da série: v84 + v88/v92 + v98 + v101 + v103 + v105. NOVA observação v107 first-hand nesta árvore (PR head c819d4a2): student-guide.md:201-203 — 'The OS saves supported setup and mission state in this browser profile. Reload the same device to resume... there is no account or cross-device synchronization'; src/progress/indexedDbProgressRepository.ts persistência local. ",
}

CARRYOVER_NOTE_ADJ = {
 'literacy-retry': ('LessonScreen.tsx:435', 'src/screens/LessonScreen.tsx:230'),
}

def build():
    out = {'schemaVersion': 1, 'gitSha': TREE, 'observedAt': '2026-10-02T01:55:00Z', 'observerContext': 'independent-readiness-observer', 'scenarios': []}
    for s in V105['scenarios']:
        sid = s['scenarioId']
        ns = copy.deepcopy(s)
        for a in ns['assertions']:
            if sid in FH:
                a['notes'] = TAG_NEW + FH[sid] + REANCHOR_OS
            else:
                old = a['notes']
                head = old.split('[Re-anchor')[0].rstrip()
                head = head.replace('nesta árvore 2b571a55', 'na árvore v105 2b571a55 (PR #607)')
                head = head.replace('nesta árvore `2b571a555c7825e9c8af69f37210d6f2596e3b09`', 'na árvore v105 `2b571a555c7825e9c8af69f37210d6f2596e3b09` (PR #607)')
                for pair in CARRYOVER_NOTE_ADJ.values():
                    head = head.replace(pair[0], pair[1])
                a['notes'] = TAG_CARRY + head + ' ' + REANCHOR_CARRY
        out['scenarios'].append(ns)
    out['scenarios'].sort(key=lambda s: (not s['scenarioId'].startswith('os-'), s['scenarioId']))
    return out

if __name__ == '__main__':
    d = build()
    import pathlib
    p = pathlib.Path('/paperclip/aid3723-evidence/observation-bundle/observations.json')
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    new = [s['scenarioId'] for s in d['scenarios'] if s['scenarioId'].startswith('os-')]
    carry = [s['scenarioId'] for s in d['scenarios'] if not s['scenarioId'].startswith('os-')]
    print('novas (os-*):', len(new)); print('carryovers:', len(carry)); print('total:', len(d['scenarios']))
    assert all('[NOVA OBSERVAÇÃO v107' in a['notes'] for s in d['scenarios'] if s['scenarioId'].startswith('os-') for a in s['assertions'])
    assert all('[CARRYOVER v107' in a['notes'] for s in d['scenarios'] if not s['scenarioId'].startswith('os-') for a in s['assertions'])
    assert all('merge ref' in a['notes'] for s in d['scenarios'] for a in s['assertions'])
    print('tags OK: 9 novas marcadas, 16 carryovers marcados, janela/merge-ref em todas as notas')
