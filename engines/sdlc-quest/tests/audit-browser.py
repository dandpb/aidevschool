#!/usr/bin/env python3
"""Focused adversarial regressions. Chromium; set_content; explicit storage doubles.
This suite never claims native file/localStorage or assistive-technology coverage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
import json, sys, time
R=Path(__file__).resolve().parents[1]
OUT=R/'audit'/ (sys.argv[1] if len(sys.argv)>1 else 'recheck-1');OUT.mkdir(parents=True,exist_ok=True)
HTML=(R/'sdlc-quest.html').read_text()
report={'method':'Chromium / set_content / explicit in-memory storage double','checks':[], 'errors':[], 'contrasts':{},'requests':[]}
def check(name,ok,detail=None):
 report['checks'].append({'name':name,'pass':bool(ok),'detail':detail})
 if not ok:print('FAIL:',name,detail)
def storage(page,raw=None,write_fail=False):
 page.evaluate('''({raw,fail})=>{window.__store={...raw};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__store[k]??null},setItem(k,v){if(fail)throw new DOMException('quota','QuotaExceededError');window.__store[k]=String(v)},removeItem(k){delete window.__store[k]}}});}''',{'raw':raw or {},'fail':write_fail})
def boot(browser,width=390,store=None,write_fail=False,native=False):
 p=browser.new_page(viewport={'width':width,'height':900},is_mobile=width<640,has_touch=width<640,reduced_motion='reduce',accept_downloads=True)
 p.on('pageerror',lambda e:report['errors'].append(str(e)))
 p.on('request',lambda req:report['requests'].append(req.url))
 if not native:storage(p,store,write_fail)
 p.set_content(HTML,wait_until='load');p.set_default_timeout(3000);return p
# Narrow DOM contrast probe, not a WCAG certification. Skip decorative/disabled/invisible nodes.
CONTRAST=(R/'tests/contrast-probe.js').read_text()
def audit_contrast(p,key):
 issues=p.evaluate(CONTRAST);report['contrasts'][key]=issues;check(key+' text contrast sample',not issues,issues)
def snapshot(p,name):p.screenshot(path=str(OUT/(name+'.png')),full_page=p.locator('dialog[open]').count()==0)
def dl(p,selector,name):
 with p.expect_download() as ev:p.locator(selector).click()
 ev.value.save_as(str(OUT/name));return (OUT/name).read_text()
def load_import(p,content,name='backup.json'):
 p.locator('[data-info="import"]').click()
 p.locator('#import-file').set_input_files({'name':name,'mimeType':'application/json','buffer':content.encode()})
 p.wait_for_timeout(100)
try:
 with sync_playwright() as pw:
  b=launch(pw);report['browser']=b.version
  p=boot(b)
  check('F01 mobile Manual has accessible name',p.get_by_role('button',name='Manual de engenharia',exact=True).count()==1)
  check('F01 mobile Artefatos has accessible name',p.get_by_role('button',name='Artefatos da jornada',exact=True).count()==1)
  check('mobile quick start visible without scrolling',p.locator('#quick-start').bounding_box()['y']<900)
  p.locator('[data-stage="0"]').focus();p.keyboard.press('Enter');p.wait_for_timeout(60)
  check('F02 focus survives station change',p.evaluate('document.activeElement.dataset.stage')=='0')
  audit_contrast(p,'mobile-home');snapshot(p,'mobile-home')
  p.locator('#settings-btn').click();p.locator('[data-info="sound"]').focus();p.keyboard.press('Enter');p.wait_for_timeout(60)
  check('F02 focus survives sound toggle',p.evaluate('document.activeElement.dataset.info')=='sound')
  p.locator('[data-info="motion"]').focus();p.keyboard.press('Enter');p.wait_for_timeout(60)
  check('F02 focus survives motion toggle',p.evaluate('document.activeElement.dataset.info')=='motion')
  audit_contrast(p,'mobile-settings')
  p.keyboard.press('Escape');p.locator('#quick-start').click();p.locator('#verify-btn').click()
  check('F03 empty answer does not consume attempt',p.evaluate('SDLCQuest.getState().attempts.intent||0')==0)
  check('F03 empty feedback clear and uncharged','Nenhuma tentativa' in p.locator('.feedback').inner_text())
  p.locator('.lesson-primer summary').click()
  check('F05 free primer opens',p.locator('.lesson-primer').evaluate('(e)=>e.open'))
  check('F05 study does not set hint penalty',not p.evaluate('SDLCQuest.getState().hints.intent'))
  check('F05 example present in challenge','Exemplo:' in p.locator('.lesson-primer').inner_text())
  audit_contrast(p,'mobile-free-concept');snapshot(p,'mobile-free-concept')
  p.locator('[data-option="promise"]').click();p.locator('#verify-btn').click()
  check('F08 concrete feedback identifies selected misconception','Promessa absoluta' in p.locator('.feedback').inner_text())
  check('F03 actual wrong answer still costs one attempt',p.evaluate('SDLCQuest.getState().attempts.intent')==1)
  p.keyboard.press('Escape');p.locator('#settings-btn').click()
  raw=dl(p,'[data-info="backup"]','backup.json');back=json.loads(raw)
  check('F07 backup format version correct',back['format']=='sdlc-quest-backup' and back['backupVersion']==1)
  check('F07 backup preserves actual attempt',back['state']['attempts']['intent']==1)
  before=p.evaluate('SDLCQuest.getState()')
  load_import(p,'{broken')
  check('F07 invalid JSON reports meaningful error','JSON válido' in p.locator('#info-content').inner_text())
  check('F07 invalid import does not alter save',p.evaluate('SDLCQuest.getState()')==before)
  p.locator('[data-info="settings"]').click();load_import(p,' '*262145)
  check('F07 oversized file denied','256 KiB' in p.locator('#info-content').inner_text())
  check('F07 oversized import does not alter save',p.evaluate('SDLCQuest.getState()')==before)
  p.locator('[data-info="settings"]').click();load_import(p,raw)
  check('F07 legitimate import requires confirmation',p.locator('[data-info="confirm-import"]').count()==1)
  check('F07 preview leaves current state intact',p.evaluate('SDLCQuest.getState()')==before)
  p.locator('[data-info="cancel-import"]').click();check('F07 cancel preserves state',p.evaluate('SDLCQuest.getState()')==before)
  p.keyboard.press('Escape');p.locator('#book-btn').click();p.locator('[data-info="transfer"]').click()
  fields={'intent':'Reduzir suporte manual com retry por tenant.','evidence':'Teste negativo de tenant vinculado ao commit da PR.','authority':'Release exige ambiente protegido e revisão externa.','stop':'Abortar com regressão e escalar ao exceder uma mitigação.'}
  for k,v in fields.items():p.locator(f'[data-transfer="{k}"]').fill(v)
  check('F09 worksheet records four decisions','4/4 campos' in p.locator('#worksheet-status').inner_text())
  check('F09 transfer is explicitly not graded','não recebe uma nota automática' in p.locator('#info-content').inner_text())
  md=dl(p,'[data-info="report"]','playbook-with-reflection.md')
  check('F09 actual written intent exported',fields['intent'] in md)
  check('F09 application is not described as verified','não foi validado' in md)
  audit_contrast(p,'mobile-transfer');snapshot(p,'mobile-transfer')
  p.locator('[data-transfer="intent"]').fill('<img src=x onerror="window.XSS=true">')
  p.keyboard.press('Escape');p.locator('#book-btn').click();p.locator('[data-info="transfer"]').click()
  check('F09 user markup stays textarea text',p.locator('textarea[data-transfer="intent"]').input_value().startswith('<img'))
  check('F09 user markup never becomes DOM',p.locator('.worksheet img').count()==0 and not p.evaluate('window.XSS||false'))
  for k,v in fields.items():p.locator(f'[data-transfer="{k}"]').fill(v)
  portable=dl(p,'[data-info="backup"]','backup-with-reflection.json')
  store=p.evaluate('window.__store');p.close();p=boot(b,store=store)
  check('F09 reload through explicit double restores worksheet',p.evaluate('SDLCQuest.getState().transfer.intent')==fields['intent'])
  p.locator('#settings-btn').click();load_import(p,raw);p.locator('[data-info="confirm-import"]').click()
  check('F07 confirm replaces worksheet with saved backup',not p.evaluate('SDLCQuest.getState().transfer.intent'))
  p.locator('#settings-btn').click();load_import(p,portable);p.locator('[data-info="confirm-import"]').click()
  check('F07 restore portable worksheet',p.evaluate('SDLCQuest.getState().transfer.intent')==fields['intent'])
  p.close()
  # Focused incident fixture: prior 16 tasks are complete, incident is pending.
  ids=['intent','risk','intent-gate','contracts','pillars','secrets','diff','redgreen','delegation','patch','evidence','evals','review','gate','guardrail','bands']
  seed={'version':1,'done':{i:{'score':100,'at':'fixture'} for i in ids},'attempts':{},'hints':{},'drafts':{},'selected':5}
  p=boot(b,store={'sdlc-quest-save-v1':json.dumps(seed)})
  p.locator('#start-mission').click();check('F06 focused fixture opens incident',p.evaluate('SDLCQuest.currentTask()')=='incident')
  p.locator('[data-incident="diagnose"]').click();p.locator('[data-incident="pause"]').click();p.keyboard.press('Escape')
  p.locator('#start-mission').click();check('F06 closing incident retains mitigation budget','AÇÕES AUTOMÁTICAS: 1/1' in p.locator('.incident-status').inner_text())
  store=p.evaluate('window.__store');p.close();p=boot(b,store=store);p.locator('#start-mission').click()
  check('F06 restoring double retains correct phase','MITIGAÇÃO APLICADA' in p.locator('.incident-status').inner_text())
  p.locator('[data-incident="pause"]').click();check('F06 second mitigation still denied after resume','Orçamento esgotado' in p.locator('.feedback').inner_text())
  for action in ['verify','escalate','record']:p.locator(f'[data-incident="{action}"]').click()
  check('F06 resumed incident completes without pretending recovery','NÃO demonstrada' in p.locator('.incident-log').inner_text())
  check('F06 resumed incident awarded once',p.evaluate('SDLCQuest.getState().done.incident.score')==85)
  audit_contrast(p,'mobile-incident');snapshot(p,'mobile-incident');p.close()
  # Native unavailable path and quota simulation, clearly distinguished.
  p=boot(b,native=True);check('unavailable native storage falls back honestly','Modo temporário' in p.locator('#save-status').inner_text());p.locator('#quick-start').click();check('unavailable storage still playable',p.evaluate('SDLCQuest.currentTask()')=='intent');p.close()
  p=boot(b,write_fail=True);check('write failure never claims saved','Modo temporário' in p.locator('#save-status').inner_text());p.close()
  for width in [320,390,768,1024,1440,1920]:
   p=boot(b,width=width)
   check(f'{width}px home no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   audit_contrast(p,f'{width}px-home')
   if width==1440:snapshot(p,'desktop-home')
   p.locator('#start-mission').click();p.locator('.lesson-primer summary').click()
   check(f'{width}px dialog no horizontal overflow',p.locator('#play-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
   audit_contrast(p,f'{width}px-primer')
   if width==1440:snapshot(p,'desktop-concept')
   p.close()
  b.close()
except Exception as e:
 report['fatal']=str(e);print('FATAL',e)
finally:
 report['passed']=sum(x['pass'] for x in report['checks']);report['failed']=sum(not x['pass'] for x in report['checks'])
 (OUT/'browser-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({k:report[k] for k in ['passed','failed','errors']},ensure_ascii=False))
 if report.get('fatal') or report['failed'] or report['errors']:sys.exit(1)
