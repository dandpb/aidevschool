#!/usr/bin/env python3
"""Actual DOM journey using a fixed answer fixture. Storage is an explicit memory double."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
import json,sys,subprocess,time
R=Path(__file__).resolve().parents[1];O=R/'evidence-v1.3'/'tlc';O.mkdir(exist_ok=True,parents=True)
H=(R/'sdlc-quest.html').read_text();G=json.loads((R/'tests/fixtures/tlc-decisions.json').read_text())
OLD=json.loads((R/'tests/fixtures/accepted-decisions.json').read_text())
D=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./src/tlc-data.js")))'],cwd=R,text=True))
PROBE=(R/'tests/contrast-probe.js').read_text()
MODE=sys.argv[1] if len(sys.argv)>1 else 'desktop';WIDTH=390 if MODE=='mobile' else 1440
report={'mode':MODE,'method':'Chromium / Playwright set_content / explicit in-memory localStorage double','checks':[],'errors':[],'requests':[],'visual':[],'limitations':['Native file:// navigation blocked by administrative policy.','No native persistent storage, Safari, Firefox or physical mobile test.','No independent subagent executed.']}
def check(name,result=True):
 if not result:raise AssertionError(name)
 report['checks'].append(name)
def load(browser,store=None,width=WIDTH):
 p=browser.new_page(viewport={'width':width,'height':900 if width<600 else 1080},has_touch=width<600,is_mobile=width<600,reduced_motion='reduce',accept_downloads=True)
 p.set_default_timeout(5000);p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('request',lambda q:report['requests'].append(q.url))
 p.evaluate('''seed=>{window.__store={...seed};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__store[k]??null},setItem(k,v){window.__store[k]=String(v)},removeItem(k){delete window.__store[k]}}});}''',store or {})
 p.set_content(H,wait_until='load');return p

def visual(p,name):
 scope=p.locator('#tlc-dialog')
 check(name+' no document horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 check(name+' no dialog horizontal overflow',scope.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
 box=scope.bounding_box();check(name+' dialog inside viewport',box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=p.viewport_size['width']+1 and box['y']+box['height']<=p.viewport_size['height']+1)
 issues=p.evaluate(PROBE);report['visual'].append({'name':name,'contrast_candidates':issues})
 if issues:print('CONTRAST',name,json.dumps(issues,ensure_ascii=False))

def choose(p,t,value):
 kind=t['type']
 if kind=='choice':p.locator(f'[data-tlc-option="{value}"]').click()
 elif kind=='select':
  for o in t['options']:
   b=p.locator(f'[data-tlc-option="{o["id"]}"]');want=o['id'] in value
   if (b.get_attribute('aria-pressed')=='true')!=want:b.click()
 elif kind in ['classify','prooflab']:
  for k,v in value.items():p.locator(f'[data-tlc-field="{k}"]').select_option(v)
 elif kind=='reviewlab':
  for o in t['options']:
   b=p.locator(f'[data-tlc-option="{o["id"]}"]');want=o['id'] in value['findings']
   if (b.get_attribute('aria-pressed')=='true')!=want:b.click()
  p.locator('#tlc-verdict').select_option(value['verdict'])
 else:raise AssertionError('unknown '+kind)

def download(p,selector,name):
 with p.expect_download() as di:p.locator(selector).click()
 d=di.value;dest=O/f'{MODE}-{name}';d.save_as(dest)
 check(name+' nonempty download',dest.stat().st_size>50)
 return dest,d.suggested_filename

def import_backup(p,text):
 p.locator('#settings-btn').click();p.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':text.encode()})
 p.locator('[data-info="confirm-import"]').click()

try:
 with sync_playwright() as pw:
  b=launch(pw);report['browser']=b.version;p=load(b)
  check('new expansion empty',p.evaluate('SDLCQuestTLC.getStats().done')==0)
  p.locator('#tlc-launch').focus();p.keyboard.press('Enter');check('keyboard opens workshop',p.locator('#tlc-dialog').evaluate('(e)=>e.open'))
  visual(p,'hub');p.screenshot(path=str(O/f'{MODE}-tlc-hub.png'))
  p.keyboard.press('Escape');check('Escape closes expansion',not p.locator('#tlc-dialog').evaluate('(e)=>e.open'))
  check('focus restored after close',p.evaluate('document.activeElement.id')=='tlc-launch')
  p.locator('[data-open-tlc="discover"]').click();check('campaign has contextual skill link',p.evaluate('SDLCQuestTLC.currentTask()')=='tlc-situation')
  p.locator('.tlc-back').click()
  for mi,m in enumerate(D['modules']):
   p.locator(f'[data-tlc-module="{mi}"]').click()
   for ti,t in enumerate(m['tasks']):
    check(t['id']+' visible',p.evaluate('SDLCQuestTLC.currentTask()')==t['id'])
    visual(p,t['id']+' before')
    p.locator('#tlc-submit').click();check(t['id']+' empty does not consume attempt',p.evaluate('(id)=>SDLCQuest.getState().tlc.attempts[id]||0',t['id'])==0)
    p.locator('.tlc-concept summary').click();check(t['id']+' free example visible',p.locator('.tlc-example').is_visible())
    check(t['id']+' studying does not consume XP',p.evaluate('(id)=>SDLCQuest.getState().tlc.attempts[id]||0',t['id'])==0)
    p.locator('.tlc-concept summary').click()
    if t['id']=='tlc-situation':
     p.locator('[data-tlc-option="stack"]').focus();p.keyboard.press('Space');check('choice retains keyboard focus',p.evaluate('document.activeElement.dataset.tlcOption')=='stack')
     p.locator('#tlc-submit').click();check('incorrect discovery blocked',not p.evaluate('!!SDLCQuest.getState().tlc.done["tlc-situation"]'))
    if t['id']=='tlc-proof-lab':
     choose(p,t,{'suite':'happy','patch':'scoped'});p.locator('#tlc-submit').click()
     check('weak regression rejected',not p.evaluate('!!SDLCQuest.getState().tlc.done["tlc-proof-lab"]'))
     check('baseline incorrectly green is visibly demonstrated','PASSOU' in p.locator('.tlc-proof').first.inner_text())
     p.screenshot(path=str(O/f'{MODE}-tlc-weak-proof.png'))
     # Save and resume draft without injecting completion flags.
     p.locator('[data-tlc="close"]').click();store=p.evaluate('window.__store');p.close();p=load(b,store)
     p.locator('#tlc-launch').click();p.locator('[data-tlc-module="2"]').click()
     check('proof draft restored at current task',p.evaluate('SDLCQuestTLC.currentTask()')=='tlc-proof-lab')
     check('proof draft values restored',p.locator('#tlc-suite').input_value()=='happy')
     check('results not invented on reload',p.locator('.tlc-proof').count()==0)
    if t['id']=='tlc-review':
     choose(p,t,{'findings':['F1'],'verdict':'APPROVE'});p.locator('#tlc-submit').click()
     check('wrong review verdict is blocked',not p.evaluate('!!SDLCQuest.getState().tlc.done["tlc-review"]'))
    choose(p,t,G[t['id']]);p.locator('#tlc-submit').click()
    check(t['id']+' completes with fixed answer',p.evaluate('(id)=>!!SDLCQuest.getState().tlc.done[id]',t['id']))
    check(t['id']+' explanation visible',p.locator('#tlc-feedback').is_visible())
    visual(p,t['id']+' solved')
    if t['id']=='tlc-proof-lab':
     check('three versions executed',p.locator('.tlc-proof').count()==3)
     check('red green red visible',p.locator('.tlc-proof.proof-red').count()==2 and p.locator('.tlc-proof.proof-green').count()==1)
     check('fifteen local assertions displayed',p.locator('.tlc-proof li').count()==15)
     proof,_=download(p,'[data-tlc="lab-proof"]','lab-execution.json');pr=json.loads(proof.read_text());check('exported local proof has fifteen assertions',sum(len(v['checks']) for v in pr['versions'])==15);check('exported local proof is red green red',[v['exitCode'] for v in pr['versions']]==[1,0,1]);check('exported local proof disclaims CI', 'não é CI' in pr['scope']);p.screenshot(path=str(O/f'{MODE}-tlc-proof.png'))
    if t['id']=='tlc-review':
     f,_=download(p,'[data-tlc="findings"]','findings.json');obj=json.loads(f.read_text());check('findings explicitly simulated',obj['simulation'] is True)
     p.screenshot(path=str(O/f'{MODE}-tlc-judge.png'))
    p.locator('#tlc-next').click()
   check(m['id']+' reward',p.locator('.tlc-reward').is_visible())
   if mi==0:
    dest,name=download(p,'[data-tlc="artifact"]','discover-artifact.md');check('artifact extension usable',name.endswith('.md'));check('artifact marks fictional example','DIDÁTICA' in dest.read_text())
   p.locator('.tlc-back').click()
  check('all sixteen completed',p.evaluate('SDLCQuestTLC.getStats().done')==16)
  check('expected XP with three mistakes',p.evaluate('SDLCQuestTLC.getStats().xp')==1555)
  check('original campaign score untouched',p.evaluate('SDLCQuest.getStats().xp')==0)
  saved=p.evaluate('SDLCQuestTLC.getStats().xp');p.locator('[data-tlc-module="0"]').click();p.locator('[data-tlc-task="0"]').click();choose(p,D['modules'][0]['tasks'][0],'situation');p.locator('#tlc-submit').click()
  check('replay adds no XP',p.evaluate('SDLCQuestTLC.getStats().xp')==saved);p.locator('.tlc-back').click()
  guide,_=download(p,'[data-tlc="guide"]','guide.md');check('guide includes all skills',all(m['skill'] in guide.read_text() for m in D['modules']));check('guide includes full official install command',D['install'] in guide.read_text())
  backup,_=download(p,'[data-tlc="backup"]','backup.json');backup_text=backup.read_text();check('backup contains expansion',len(json.loads(backup_text)['state']['tlc']['done'])==16)
  p.locator('[data-tlc="kit"]').click();visual(p,'kit');check('install command exact',p.locator('#tlc-install-command').inner_text()==D['install']);check('all four safe source links',p.locator('.tlc-prompt-card a[rel="noopener noreferrer"]').count()==4)
  p.locator('[data-tlc="copy-install"]').click()
  # This blank-page sandbox normally disallows clipboard; a selectable fallback must appear.
  if p.locator('#tlc-copy-text').count():check('clipboard fallback retains command',p.locator('#tlc-copy-text').input_value()==D['install'])
  p.locator('[data-tlc-copy="judge"]').click()
  if p.locator('#tlc-copy-text').count():check('prompt copy fallback exact',p.locator('#tlc-copy-text').input_value()==D['modules'][3]['prompt'])
  p.locator('[data-tlc="close"]').click();p.close();p=load(b);import_backup(p,backup_text)
  check('backup import restores all TLC achievements',p.evaluate('SDLCQuestTLC.getStats().done')==16)
  check('backup import restores score',p.evaluate('SDLCQuestTLC.getStats().xp')==1555)
  old_state={'version':1,'done':{id:{'score':100,'at':'v1.1-import-fixture'} for id in OLD},'transfer':{'intent':'Minha feature da v1.1'},'selected':5}
  old_backup=json.dumps({'format':'sdlc-quest-backup','backupVersion':1,'appVersion':'1.1.0','state':old_state})
  import_backup(p,old_backup)
  check('v1.1 import keeps eighteen achievements',p.evaluate('SDLCQuest.getStats().done')==18)
  check('v1.1 import keeps original 1800 XP',p.evaluate('SDLCQuest.getStats().xp')==1800)
  check('v1.1 notes preserved',p.evaluate('SDLCQuest.getState().transfer.intent')=='Minha feature da v1.1')
  check('v1.1 old-only backup starts expansion empty',p.evaluate('SDLCQuestTLC.getStats().done')==0)
  p.locator('#book-btn').click();p.locator('#glossary-search').fill('the-judge');check('skill in main manual',p.locator('.glossary-item').count()>0)
  p.locator('[data-info="close"]').click();p.close()
  for w in [320,768]:
   q=load(b,width=w);q.locator('#tlc-launch').click();visual(q,f'{w}-hub');q.screenshot(path=str(O/f'{w}-tlc-hub.png'));q.locator('[data-tlc-module="2"]').click();visual(q,f'{w}-profile');q.close()
  check('no page errors',not report['errors']);check('no runtime HTTP requests',not any(u.startswith(('http:','https:')) for u in report['requests']))
  b.close()
except Exception as exc:
 report['fatal']=str(exc)
 try:p.screenshot(path=str(O/f'{MODE}-tlc-failure.png'))
 except Exception:pass
finally:
 report['passed']=len(report['checks']);report['contrast_failed_states']=sum(bool(v['contrast_candidates']) for v in report['visual']);(O/f'tlc-{MODE}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({k:report.get(k) for k in ['mode','passed','fatal','errors','contrast_failed_states']},ensure_ascii=False))
 if report.get('fatal') or report['errors'] or report['contrast_failed_states']:sys.exit(1)
