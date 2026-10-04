"""Validate frozen inputs and recorded answers before computing any live metric."""
import hashlib
import json
import math

from paths import ROOT


def input_digest(case):
    payload = {'state': case['state'], 'questions': case['questions']}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def load_corpus():
    data = (ROOT / 'dataset.jsonl').read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    expected = (ROOT / 'dataset.sha256').read_text().split()[0]
    if digest != expected:
        raise ValueError('Frozen corpus digest mismatch')
    rows = [json.loads(line) for line in data.splitlines() if line.strip()]
    cases = {c['id']: c for c in rows}
    shape = (len(rows), sum(len(c['questions']) for c in rows),
             sum(len(c['expected']) for c in rows), sum('expected_top_engine' in c for c in rows))
    if shape != (62, 220, 142, 6) or len(cases) != len(rows):
        raise ValueError('Frozen corpus shape or unique IDs mismatch')
    return cases, digest


def number(value, lower, upper, context):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f'{context}: expected numerical value')
    if not math.isfinite(value) or not lower <= value <= upper:
        raise ValueError(f'{context}: out-of-range or nonfinite value')


def validate_result(case, result):
    if not isinstance(result, dict) or not isinstance(result.get('model'), str) or not result['model']:
        raise ValueError('Missing response model identity')
    answers = result.get('answers')
    if not isinstance(answers, dict) or set(answers) != set(case['questions']):
        raise ValueError('Answer keys differ from question keys')
    for qid, question in case['questions'].items():
        answer = answers[qid]
        kind = question['type']
        if not isinstance(answer, dict) or answer.get('type') != kind:
            raise ValueError(f'{qid}: incorrect answer type')
        if kind == 'choice' and answer.get('choice') not in question['criteria']:
            raise ValueError(f'{qid}: invalid choice')
        if kind in ('score', 'noul'):
            maximum = len(question['criteria']) - 1 if kind == 'score' else 1
            number(answer.get(kind), 0, maximum, qid)
        if kind in ('choice', 'score'):
            keys = set(question['criteria']) if kind == 'choice' else {str(i) for i in range(len(question['criteria']))}
            probabilities = answer.get('probabilities')
            if not isinstance(probabilities, dict) or set(probabilities) != keys:
                raise ValueError(f'{qid}: probability keys differ from criteria')
            for value in probabilities.values():
                number(value, 0, 1, f'{qid}: probability')
            # Providers round probabilities; tolerate at most two percentage points.
            if abs(sum(probabilities.values()) - 1) > 0.02:
                raise ValueError(f'{qid}: probability mass does not sum to one')
        for field in ('confidence', 'answer_confidence'):
            if field in answer:
                number(answer[field], 0, 1, f'{qid}: {field}')
    return result


def validate_records(records, cases, corpus_digest):
    seen = set()
    identities = set()
    warmed = set()
    manifest = json.loads((ROOT / 'checkpoint-manifest.json').read_text())
    entries = {e['name']: e for e in manifest['checkpoints']}
    for record in records:
        cid = record.get('id')
        if cid not in cases or cid in seen:
            raise ValueError(f'Unknown or repeated case ID: {cid}')
        seen.add(cid)
        if record.get('input_sha256') != input_digest(cases[cid]):
            raise ValueError(f'{cid}: recorded input digest mismatch')
        if 'corpus_sha256' in record and record['corpus_sha256'] != corpus_digest:
            raise ValueError(f'{cid}: recorded corpus digest mismatch')
        if record.get('backend') not in ('laya', 'jev') or not isinstance(record.get('requested_model'), str):
            raise ValueError(f'{cid}: invalid backend or requested model')
        identities.add((record['backend'], record['requested_model']))
        number(record.get('elapsed_ms'), 0, float('inf'), f'{cid}: elapsed_ms')
        for field in ('load_ms', 'warmup_ms', 'warm_inference_ms', 'http_roundtrip_ms'):
            if record.get(field) is not None:
                number(record[field], 0, float('inf'), f'{cid}: {field}')
        if record.get('status') == 'ok':
            validate_result(cases[cid], record.get('result'))
            if record.get('format_version') == 2:
                if record.get('corpus_sha256') != corpus_digest:
                    raise ValueError(f'{cid}: version two requires corpus digest')
                timing_fields = ('load_ms', 'warmup_ms', 'warm_inference_ms', 'http_roundtrip_ms')
                if not all(field in record for field in timing_fields):
                    raise ValueError(f'{cid}: missing version-two timing fields')
                if record['backend'] == 'laya':
                    checkpoint = record.get('checkpoint')
                    entry = entries.get(checkpoint)
                    if (not entry or record.get('weights_sha256') != entry['sha256']
                            or record.get('weights_revision') != manifest['revision']
                            or record.get('source_commit') != '8a6e1328cce2460a0e5aa348ad465bb1b5821cd2'
                            or record.get('offline') is not True or record.get('device') != 'cpu'):
                        raise ValueError(f'{cid}: invalid pinned checkpoint provenance')
                    if record['result'].get('routing', {}).get('model') != checkpoint:
                        raise ValueError(f'{cid}: response routing differs from declared checkpoint')
                    if record['warm_inference_ms'] is None or record['http_roundtrip_ms'] is not None:
                        raise ValueError(f'{cid}: invalid local timing contract')
                    if checkpoint not in warmed:
                        if record['load_ms'] is None or record['warmup_ms'] is None:
                            raise ValueError(f'{cid}: first checkpoint use lacks load/warmup timing')
                        warmed.add(checkpoint)
                    elif record['load_ms'] is not None or record['warmup_ms'] is not None:
                        raise ValueError(f'{cid}: unexpected repeated checkpoint preparation')
                else:
                    if (record['http_roundtrip_ms'] is None
                            or any(record[field] is not None for field in timing_fields[:3])
                            or 'checkpoint' in record):
                        raise ValueError(f'{cid}: invalid HTTP timing contract')
                component_total = sum(record[field] or 0 for field in timing_fields)
                if component_total > record['elapsed_ms'] + 0.01:
                    raise ValueError(f'{cid}: component timings exceed total time')
            elif 'format_version' in record:
                raise ValueError(f'{cid}: unsupported evidence format version')
        elif record.get('status') == 'error':
            if 'result' in record or not isinstance(record.get('error'), str):
                raise ValueError(f'{cid}: invalid error evidence')
        else:
            raise ValueError(f'{cid}: invalid evidence status')
    if len(identities) > 1:
        raise ValueError('Mixed backends or requested models in a single evidence file')
