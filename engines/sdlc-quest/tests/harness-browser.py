#!/usr/bin/env python3
"""Quest-local harness journeys. No remote agents; no external repository execution.
Uses set_content and an explicit localStorage memory double. Runtime failures are not skipped.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
import json, sys, time
R=Path(__file__).resolve().parents[1];O=R/'evidence-v1.3'/'harness';O.mkdir(exist_ok=True,parents=True)
H=(R/'sdlc-quest.html').read_text();PROBE=(R/'tests/contrast-probe.js').read_text()
MODE=sys.argv[1] if len(sys.argv)>1 else 'desktop';WIDTH=390 if MODE=='mobile' else 1440
START=time.monotonic()
report={'mode':MODE,'method':'Chromium + set_content; explicit in-memory localStorage double','checks':[],'errors':[],'requests':[],'visual':[],'limitations':['No native file:// navigation; blocked by browser administrator policy in environment probe.','No native persistent-storage, physical-device, Safari, Firefox or screen-reader validation.','No actual harness-toolkit, skills, independent subagent or production access.']}
def check(name,condition=True):
 if not condition:raise AssertionError(name)
 report['checks'].append(name);print(f'{time.monotonic()-START:.1f}s','PASS',len(report['checks']),name,flush=True)
 if len(report['checks'])%10==0:(O/f'{MODE}-progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
def state(p):return p.evaluate('SDLCQuestHarness.getState()')
def load(b,store=None,width=WIDTH,native=False):
 p=b.new_page(viewport={'width':width,'height':844 if width<600 else 1000},has_touch=width<600,is_mobile=width<600,reduced_motion='reduce',accept_downloads=True)
 p.set_default_timeout(6000);p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('request',lambda q:report['requests'].append(q.url))
 if not native:p.evaluate('''seed=>{window.__store={...seed};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__store[k]??null},setItem(k,v){window.__store[k]=String(v)},removeItem(k){delete window.__store[k]}}});}''',store or {})
 p.set_content(H,wait_until='load');return p

def visual(p,label,screenshot=False):
 scope=p.locator('#harness-dialog');check(label+' document fits width',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 check(label+' dialog content fits width',scope.evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
 b=scope.bounding_box();check(label+' dialog inside viewport',b['x']>=-1 and b['y']>=-1 and b['x']+b['width']<=p.viewport_size['width']+1 and b['y']+b['height']<=p.viewport_size['height']+1)
 issues=p.evaluate(PROBE);report['visual'].append({'state':label,'contrastCandidates':issues});check(label+' sampled text contrast',not issues)
 if screenshot:
  scope.evaluate('e=>e.scrollTop=0');p.screenshot(path=str(O/f'{MODE}-{label}.png'))

def run(p,selector='#h-execute'):
 seq=state(p)['sequence'];p.locator(selector).click();p.wait_for_function('n=>SDLCQuestHarness.getState().sequence>n',arg=seq)
 p.wait_for_function('!document.querySelector("#h-execute")?.disabled');return state(p)
def step(p,i):p.locator(f'#h-step-{i}').click()
def setv(p,key,value):
 p.locator(f'#h-field-{key}').select_option(value)
 check('input '+key+' keeps focus',p.evaluate('document.activeElement.id')=='h-field-'+key)
def download(p,selector,name):
 with p.expect_download() as d:p.locator(selector).click()
 dest=O/f'{MODE}-{name}';d.value.save_as(dest);check(name+' has bytes',dest.stat().st_size>40);return dest.read_text()
def import_backup(p,text):
 p.locator('#settings-btn').click();p.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':text.encode()})
 p.locator('[data-info="confirm-import"]').click()
def prefix(p):
 for i in range(3):step(p,i);run(p)
try:
 with sync_playwright() as pw:
  b=launch(pw);report['browser']=b.version;p=load(b)
  check('old campaign starts unchanged',p.evaluate('SDLCQuest.getStats().done')==0)
  check('TLC expansion starts unchanged',p.evaluate('SDLCQuestTLC.getStats().done')==0)
  p.locator('#harness-launch').focus();p.keyboard.press('Enter');check('keyboard opens lab',p.locator('#harness-dialog').is_visible());visual(p,'initial',True)
  check('real integration pending disclosed',p.locator('.h-notice').first.inner_text().find('Integração real pendente')>=0)
  check('provided repository reference exact',p.locator(f'#harness-content a[href="https://github.com/dandpb/harness-toolkit"]').count()==1)
  check('repo source link safe new tab',p.locator('#harness-content a').first.get_attribute('rel')=='noopener noreferrer')
  check('package download disabled before checks',p.locator('#h-package').is_disabled())
  # Adversarial UI dispatch: removing disabled must not make the handler export a package.
  ds=[];p.on('download',lambda d:ds.append(d.suggested_filename));p.locator('#h-package').evaluate('e=>{e.disabled=false;e.click()}');p.wait_for_timeout(80)
  check('forged enabled button cannot export missing package',not ds)
  s=run(p,'#h-skip');check('skip package records block',s['log'][-1]['outcome']=='blocked');check('skip no receipts',not s['receipts'])
  s=run(p,'#h-declare');check('self declaration rejected',s['log'][-1]['outcome']=='rejected');check('claim no receipts',not s['receipts'])
  step(p,0);s=run(p);check('incomplete intent fails',s['receipts']['discover']['status']=='failed')
  setv(p,'intent','complete');s=run(p);check('complete intent executed',s['receipts']['discover']['status']=='passed');visual(p,'discover')
  step(p,1);s=run(p);check('incomplete plan fails',s['receipts']['plan']['status']=='failed');setv(p,'plan','traceable');s=run(p);check('complete plan executed',s['receipts']['plan']['status']=='passed')
  step(p,2);s=run(p);check('original materialized without pretending verification',s['receipts']['implement']['status']=='passed' and 'verify' not in s['receipts'])
  step(p,3);setv(p,'suite','contract');s=run(p);check('buggy candidate rejected by tests',s['receipts']['verify']['status']=='failed')
  check('all fifteen checks executed for buggy candidate',len(s['receipts']['verify']['checks'])==15);check('failure is real cross tenant result',s['lastTests']['versions'][1]['checks'][2]['actual']=='B');visual(p,'failed-tests',True)
  step(p,2);setv(p,'patch','scoped');check('code edit invalidates implementation',state(p)['receipts']['implement']['status']=='stale');s=run(p)
  step(p,3);s=run(p);check('correct candidate passes complete proof',s['receipts']['verify']['status']=='passed')
  check('baseline and mutant fail as required',[v['exitCode'] for v in s['lastTests']['versions']]==[1,0,1]);visual(p,'verified-tests',True)
  step(p,4);setv(p,'review','stale');s=run(p);check('stale review rejected',s['receipts']['judge']['status']=='failed')
  setv(p,'review','current');s=run(p);check('current simulated review accepted locally',s['receipts']['judge']['status']=='passed')
  check('review not presented as independent agent',s['receipts']['judge']['independentReview']==False)
  step(p,5);s=run(p);check('package requires and has six current receipts',p.evaluate('SDLCQuestHarness.getReport().summary.currentSteps')==6)
  check('validated package button unlocked',not p.locator('#h-package').is_disabled());visual(p,'local-package',True)
  exported=json.loads(download(p,'#h-package','package.json'));check('export contains executed checks',len(exported['receipts']['verify']['checks'])==15)
  check('export never claims toolkit executed',exported['summary']['toolkitExecuted']==False)
  check('export never claims production authorization',exported['summary']['productionAuthorized']==False)
  check('export never claims independent reviewer',exported['summary']['independentReviewerExecuted']==False)
  check('export marks own schema',exported['format']=='quest-harness-demo')
  check('export marks source access missing',exported['sourceRepository']['status']=='not-inspected')
  s=run(p,'#h-production');check('production denied even after six gates',s['log'][-1]['outcome']=='denied')
  p.keyboard.press('Escape');check('Escape closes lab',not p.locator('#harness-dialog').is_visible());check('keyboard focus returns to launch',p.evaluate('document.activeElement.id')=='harness-launch')
  p.locator('#harness-launch').click();check('reopening same page preserves current execution',p.evaluate('SDLCQuestHarness.getReport().summary.currentSteps')==6)
  p.locator('#h-edit').click();check('editing after green keeps only two earlier receipts',p.evaluate('SDLCQuestHarness.getReport().summary.currentSteps')==2)
  check('editing disables previously valid package download',p.locator('#h-package').is_disabled());check('verification explicitly stale',state(p)['receipts']['verify']['status']=='stale');visual(p,'invalidated',True)
  s=run(p);check('cannot rerun package with stale evidence',s['log'][-1]['outcome']=='blocked')
  step(p,2);setv(p,'patch','scoped');run(p)
  for i in [3,4,5]:step(p,i);run(p)
  check('revalidation restores package',p.evaluate('SDLCQuestHarness.getReport().summary.currentSteps')==6)
  check('six training goals actually earned',all(state(p)['goals'].get(k) for k in ['order','claim','bug','executed','stale','package']))
  guide=download(p,'[data-h-action="guide"]','guide.md') if p.locator('.h-integration').evaluate('e=>e.open') else None
  if guide is None:
   p.locator('.h-integration summary').click();guide=download(p,'[data-h-action="guide"]','guide.md')
  check('guide contains real integration gap',('Nenhuma API' in guide or 'Nenhuma' in guide) and 'harness-toolkit' in guide)
  backup=download(p,'[data-h-action="backup"]','backup.json');raw=json.loads(backup)
  check('backup stores harness inputs only','receipts' not in raw['state']['harness'] and raw['state']['harness']['inputs']['patch']=='scoped')
  p.locator('#h-new-run').click();check('new run requires explicit confirmation',p.locator('#h-confirm-reset').is_visible())
  p.locator('[data-h-action="cancel-reset"]').click();check('cancel keeps receipts',p.evaluate('SDLCQuestHarness.getReport().summary.currentSteps')==6)
  p.locator('#h-new-run').click();p.locator('#h-confirm-reset').click();check('new run clears receipts',not state(p)['receipts']);prefix(p)
  step(p,3);setv(p,'runner','unavailable')
  for i in range(3):run(p)
  check('third verifier failure halts',state(p)['halted'] and state(p)['failures']['verify']==3)
  check('unavailable verifier produces no fabricated checks',state(p)['receipts']['verify']['checks']==[]);visual(p,'budget-exhausted',True)
  setv(p,'runner','normal');s=run(p);check('changing verifier cannot bypass exhausted budget',s['log'][-1]['outcome']=='blocked')
  diag=json.loads(download(p,'#h-report','diagnostic.json'));check('diagnostic distinguishes failure from ready',diag['summary']['halted'] and not diag['summary']['localPackageReady'])
  p.keyboard.press('Escape');check('main campaign XP unaffected by lab',p.evaluate('SDLCQuest.getStats().xp')==0);check('TLC XP unaffected by lab',p.evaluate('SDLCQuestTLC.getStats().xp')==0)
  p.locator('#tlc-launch').click();p.locator('#tlc-content [data-open-harness]').click();check('TLC has integrated entry point to harness',p.locator('#harness-dialog').is_visible());check('only one modal stays open',p.locator('dialog[open]').count()==1);p.keyboard.press('Escape')
  p.locator('#book-btn').click();p.locator('#glossary-search').fill('harness');check('manual documents pending toolkit integration','integração real pendente' in p.locator('#info-content').inner_text().lower());p.keyboard.press('Escape')
  p.close();p=load(b);import_backup(p,backup);p.locator('#harness-launch').click();check('restored settings preserve candidate',state(p)['inputs']['patch']=='scoped');check('backup import never restores passed checks',not state(p)['receipts'])
  p.keyboard.press('Escape')
  old={'format':'sdlc-quest-backup','backupVersion':1,'appVersion':'1.2.0','state':{'version':1,'done':{},'transfer':{'intent':'Feature antiga'},'tlc':{'version':1,'done':{'tlc-situation':{'score':100,'at':'fixture'}}}}}
  import_backup(p,json.dumps(old));check('v1.2 TLC achievement preserved',p.evaluate('SDLCQuestTLC.getStats().done')==1);check('v1.2 note preserved',p.evaluate('SDLCQuest.getState().transfer.intent')=='Feature antiga')
  p.locator('#harness-launch').click();check('v1.2 import creates fresh lab',state(p)['inputs']['patch']=='original' and not state(p)['receipts']);p.close()
  for width in [320,768]:
   q=load(b,width=width);q.locator('#harness-launch').click();visual(q,str(width)+'-initial',True)
   for i in range(6):step(q,i);visual(q,str(width)+'-step-'+str(i))
   q.close()
  q=load(b,native=True);q.locator('#harness-launch').click();run(q,'#h-declare');check('native storage unavailable path still operates',state(q)['goals']['claim']);q.close()
  check('no JavaScript errors',not report['errors']);check('no runtime HTTP requests',not any(u.startswith(('http:','https:')) for u in report['requests']))
  b.close()
except Exception as e:
 report['fatal']=str(e)
 try:p.screenshot(path=str(O/f'{MODE}-failure.png'))
 except Exception:pass
finally:
 report['passed']=len(report['checks']);report['contrast_failed_states']=sum(bool(v['contrastCandidates']) for v in report['visual']);(O/f'harness-{MODE}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:report.get(k) for k in ['mode','passed','fatal','errors','contrast_failed_states']},ensure_ascii=False))
 if report.get('fatal') or report['errors'] or report['contrast_failed_states']:sys.exit(1)
