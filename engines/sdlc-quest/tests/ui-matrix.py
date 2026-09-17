#!/usr/bin/env python3
"""Visual/DOM matrix with explicitly seeded prior progress; not a whole-journey claim."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
import json,sys
R=Path(__file__).resolve().parents[1];O=R/'audit'/(sys.argv[1] if len(sys.argv)>1 else 'matrix');O.mkdir(parents=True,exist_ok=True)
H=(R/'sdlc-quest.html').read_text();G=json.loads((R/'tests/fixtures/accepted-decisions.json').read_text());PROBE=(R/'tests/contrast-probe.js').read_text();report={'method':'seeded prior progress; displayed task solved with fixed independent fixtures','samples':[],'errors':[]}
def audit(p,key):
 issues=p.evaluate(PROBE)
 modal=p.locator('#play-dialog');overflow=modal.evaluate('(e)=>e.scrollWidth>e.clientWidth+1')
 report['samples'].append({'state':key,'contrast_candidates':issues,'horizontal_overflow':overflow})
 if issues or overflow:print(key,'overflow=',overflow,json.dumps(issues,ensure_ascii=False))
def solve(p,t):
 a=G[t['id']];kind=t['type']
 if kind in ['select','diff']:
  for v in a:p.locator(f'[data-option="{v}"]').click()
 elif kind in ['choice','patch']:p.locator(f'[data-option="{a}"]').click()
 elif kind in ['classify','gate']:
  for k,v in a.items():p.locator(f'[data-field="{k}"]').select_option(v)
 elif kind=='order':
  for v in a:p.locator(f'[data-step="{v}"]').click()
 elif kind=='incident':
  for v in ['diagnose','pause','verify','escalate','record']:p.locator(f'[data-incident="{v}"]').click()
  return
 p.locator('#verify-btn').click()
try:
 with sync_playwright() as pw:
  b=launch(pw);report['browser']=b.version
  for width in [390,1440]:
   for ix,task_id in enumerate(G):
    p=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
    p.on('pageerror',lambda e:report['errors'].append(str(e)))
    seed={'version':1,'done':{i:{'score':100,'at':'explicit-matrix-fixture'} for i in list(G)[:ix]},'selected':ix//3}
    p.evaluate('''seed=>{const store={'sdlc-quest-save-v1':JSON.stringify(seed)};Object.defineProperty(window,'localStorage',{value:{getItem(k){return store[k]??null},setItem(k,v){store[k]=v}}});}''',seed)
    p.set_content(H);p.locator('#start-mission').click();t=p.evaluate('(id)=>QuestData.missions.flatMap(m=>m.tasks).find(t=>t.id===id)',task_id)
    assert p.evaluate('SDLCQuest.currentTask()')==task_id
    audit(p,f'{width}-{task_id}-empty')
    solve(p,t);assert p.evaluate('(id)=>!!SDLCQuest.getState().done[id]',task_id)
    audit(p,f'{width}-{task_id}-solved')
    if task_id in ['patch','gate','incident']:
     p.screenshot(path=str(O/f'{width}-{task_id}.png'))
    if ix%3==2:
     p.locator('#verify-btn').click();audit(p,f'{width}-{task_id}-reward')
     if task_id=='loop':
      p.locator('[data-action="advance"]').click();audit(p,f'{width}-final');p.screenshot(path=str(O/f'{width}-final.png'))
    p.close()
  b.close()
except Exception as e:report['fatal']=str(e);print('FATAL',str(e))
finally:
 report['failed_states']=sum(bool(x['contrast_candidates']) or x['horizontal_overflow'] for x in report['samples'])
 (O/'visual-matrix.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('states:',len(report['samples']),'failed:',report['failed_states'],'errors:',report['errors'])
 if report.get('fatal') or report['failed_states'] or report['errors']:sys.exit(1)
