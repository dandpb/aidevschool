#!/usr/bin/env python3
"""AID-1265 item 3 — leitura do funil LIVE pós-promoção W1 (AID-1254).
Por superfície: health /, 2x POST byte-idêntico (eventId UUID) -> 202/202,
export sem bearer -> 401, export com bearer -> 200 ndjson >0 linhas,
exatamente 1 linha p/ o próprio eventId (dedup Blobs; propagação 1-8 min),
presença de ingestão pós-promoção (occurredAt > 2026-09-10T11:26:36Z) e
marcadores de ondas anteriores (durabilidade).
Uso: funnel_probe.py <label> <base> <token> <envelope os|literacy>
"""
import json, sys, time, uuid, urllib.request, urllib.error

label, base, token, envelope = sys.argv[1:6]
PROMO_TS = "2026-09-10T11:26:36Z"
marker = str(uuid.uuid4())
results = []

def check(name, ok, detail):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'} {name} — {detail}")

def req(method, path, body=None, auth=False, ctype='application/json'):
    r = urllib.request.Request(base + path, method=method)
    if body is not None:
        r.data = body.encode()
    r.add_header('content-type', ctype)
    r.add_header('sec-fetch-site', 'same-origin')
    if auth:
        r.add_header('authorization', f'Bearer {token}')
    try:
        resp = urllib.request.urlopen(r, timeout=60)
        return resp.status, resp.read().decode(), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), e.headers

def envelope_body(m):
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    sid = str(uuid.uuid4())
    if envelope == 'os':
        return json.dumps({'schemaVersion': 1, 'events': [{'schemaVersion': 1, 'eventId': m,
            'name': 'onboarding.started', 'occurredAt': now, 'sequence': 1,
            'dimensions': {'installationId': 'qa-aid1265-funnel', 'sessionId': sid}}]})
    return json.dumps({'schemaVersion': 2, 'source': 'literacydojo', 'events': [{'schemaVersion': 2,
        'source': 'literacydojo', 'event': 'entry_viewed', 'eventId': m, 'sessionId': sid,
        'occurredAt': now, 'contentVersion': '2026-09-10.1', 'props': {}}]})

st0, _, _ = req('GET', '/')
check(f'{label} health GET / -> 200', st0 == 200, f'status={st0}')

body = envelope_body(marker)
st1, t1, _ = req('POST', '/__dojo/bridge/v1/analytics', body)
try:
    acc1 = json.loads(t1).get('acceptedEventIds', [])
except Exception:
    acc1 = []
check(f'{label} POST #1 -> 202 c/ acceptedEventIds (UUID)', st1 == 202 and marker in acc1, f'status={st1} accepted={acc1}')

time.sleep(2)
st2, _, _ = req('POST', '/__dojo/bridge/v1/analytics', body)
check(f'{label} POST #2 byte-idêntico -> 202', st2 == 202, f'status={st2}')

stn, tn, _ = req('GET', '/__dojo/bridge/v1/analytics?from=2026-09-05&to=2026-09-10')
try:
    errn = json.loads(tn).get('error', '')
except Exception:
    errn = ''
check(f'{label} export SEM bearer -> 401 unauthorized (fail-closed)', stn == 401 and errn == 'unauthorized', f'status={stn} error={errn}')

def export_lines():
    st, txt, hd = req('GET', '/__dojo/bridge/v1/analytics?from=2026-09-05&to=2026-09-10', auth=True)
    return st, txt, hd, [l for l in txt.split('\n') if l.strip()]

st3, txt3, hd3, lines3 = export_lines()
ct = hd3.get('content-type', '')
check(f'{label} export COM bearer -> 200 ndjson', st3 == 200 and 'ndjson' in ct, f'status={st3} ct={ct}')
check(f'{label} export >0 linhas', len(lines3) > 0, f'lines={len(lines3)}')

deadline = time.time() + 480
ma = [l for l in lines3 if marker in l]
polled = 0
while len(ma) != 1 and time.time() < deadline:
    time.sleep(30)
    polled += 1
    st3, txt3, hd3, lines3 = export_lines()
    ma = [l for l in lines3 if marker in l]
    print(f'  poll {label}: lines={len(lines3)} matching={len(ma)} elapsed~{polled*30}s')
check(f'{label} dedup: exatamente 1 linha p/ eventId após 2x POST idêntico', len(ma) == 1, f'matching={len(ma)} lines={len(lines3)}')

# ingestão pós-promoção: linhas ocorridas após o deploy promovido (11:26:36Z)
post_promo = []
for l in lines3:
    try:
        ev = json.loads(l)
        if ev.get('occurredAt', '') > PROMO_TS:
            post_promo.append(ev)
    except Exception:
        pass
check(f'{label} ingestão pós-promoção (> {PROMO_TS}) presente', len(post_promo) > 0, f'events={len(post_promo)}')
cv_new = sum(1 for e in post_promo if e.get('contentVersion') == '2026-09-10.1')
if envelope == 'literacy':
    check(f'{label} eventos literacy pós-promoção com contentVersion 2026-09-10.1', cv_new > 0, f'count={cv_new}')
own_new = sum(1 for e in post_promo if e.get('eventId') == marker)
check(f'{label} sonda própria conta como pós-promoção (sanity)', own_new == 1, f'own={own_new}')

# durabilidade: linhas de dias anteriores (ondas anteriores)
prior_days = {}
for l in lines3:
    try:
        ev = json.loads(l)
        day = ev.get('occurredAt', '')[:10]
        if day and day < '2026-09-10':
            prior_days[day] = prior_days.get(day, 0) + 1
    except Exception:
        pass
check(f'{label} durabilidade: eventos de ondas anteriores presentes', len(prior_days) > 0, f'days={prior_days}')

# zero-PII nos envelopes do dia (só UUIDs/enums)
uuid_like = 0
bad = 0
for l in lines3:
    try:
        ev = json.loads(l)
    except Exception:
        bad += 1
        continue
    eid = ev.get('eventId', '')
    try:
        uuid.UUID(eid)
        uuid_like += 1
    except Exception:
        bad += 1
check(f'{label} eventIds todos UUID (zero-PII no export)', bad == 0 and uuid_like == len(lines3), f'uuid={uuid_like} non-uuid/bad={bad} total={len(lines3)}')

print(f'\n[{label}] {sum(results)}/{len(results)} passed')
open(f'/tmp/opencode/aid1265/export_{envelope}.ndjson', 'w').write(txt3)
open(f'/tmp/opencode/aid1265/funnel_{envelope}.summary.txt', 'w').write(f'{label}: {sum(results)}/{len(results)} marker={marker} lines={len(lines3)}\n')
sys.exit(0 if all(results) else 1)
