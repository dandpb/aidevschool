#!/usr/bin/env python3
"""Bilingual chrome journey: pt-BR default, English toggle, persistence and progress safety.

C1/C2/C3 (default, toggle, persistence, progress preserved) plus the C9 single-file
marker probe and the C10 English wrong-answer core text. The C10 assertion targets the
CORE-module strings (gate feedback + missing-pieces message): option labels and the
selectionReasons `why` texts are data fields whose `_en` variants land in batch B2, so
the pt-BR why may legitimately coexist in an otherwise-English panel here.
Same sandbox pattern as the other journeys: Playwright set_content with an explicit
in-memory localStorage double; a "reload" is a new page seeded with the previous double
contents. We do not claim to have tested native file:// navigation or native storage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
import json,sys,time
R=Path(__file__).resolve().parents[1];O=R/'evidence-v1.3'/'i18n';O.mkdir(exist_ok=True,parents=True)
H=(R/'sdlc-quest.html').read_text(encoding='utf-8')
GOLDEN=json.loads((R/'tests/fixtures/accepted-decisions.json').read_text())
PT_MARKER='Progresso salvo neste navegador';EN_MARKER='Progress saved in this browser'
report={'method':'Chromium / Playwright set_content / explicit in-memory localStorage double','checks':[],'errors':[],'requests':[],'started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'limitations':['Native file:// navigation blocked by administrative policy.','No native localStorage persistence, Safari or Firefox test.','Data-record _en fields (option labels, why texts) arrive in batch B2; core-module strings are covered here.','Exported documents (playbook, TLC guide, harness guide) remain pt-BR by design.']}
def check(name,result=True):
 if not result:raise AssertionError(name)
 report['checks'].append(name)
def load(browser,store=None):
 p=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 p.set_default_timeout(5000);p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('request',lambda q:report['requests'].append(q.url))
 p.evaluate('''seed=>{window.__store={...seed};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__store[k]??null},setItem(k,v){window.__store[k]=String(v)},removeItem(k){delete window.__store[k]}}});}''',store or {})
 p.set_content(H,wait_until='load');return p
def body(p):return p.locator('body').inner_text()
def press(p,option,want=True):
 """Drafts persist a previous selection across dialog rounds; set the card to the wanted state."""
 if (p.locator(f'[data-option="{option}"]').get_attribute('aria-pressed')=='true')!=want:
  p.locator(f'[data-option="{option}"]').click()
try:
 with sync_playwright() as b0:
  b=launch(b0)
  p=load(b)
  # C1: absence of the preference key means pt-BR, byte-stable chrome.
  check('default-pt',PT_MARKER in p.locator('#save-status').inner_text()
        and p.evaluate('document.documentElement.lang')=='pt-BR'
        and 'EN' in p.locator('#lang-btn').inner_text()
        and p.locator('#lang-btn').get_attribute('aria-label')=='Trocar idioma para inglês'
        and p.evaluate('document.title')=='SDLC Quest v1.3 — Laboratório de execução'
        and 'GUARDIÕES DO RELEASE' in p.locator('.brand').inner_text()
        and p.evaluate("window.__store['sdlc-quest:lang']??null") is None)
  p.screenshot(path=str(O/'pt-home.png'))
  # Open mission 0 and take a wrong PT answer first: core messages must stay pt-BR.
  p.locator('[data-stage="0"]').click();p.locator('#start-mission').click()
  check('mission zero opens intent',p.evaluate('SDLCQuest.currentTask()')=='intent')
  press(p,'promise');p.locator('#verify-btn').click()
  check('pt wrong answer keeps pt core text','Faltam 4 peça(s) do contrato' in p.locator('#feedback-slot').inner_text()
        and 'O gate segurou a mudança.' in p.locator('#feedback-slot').inner_text())
  p.keyboard.press('Escape')
  # C2: toggle to English; chrome swaps, nothing else changes underneath.
  p.locator('#lang-btn').click()
  check('toggle-en-chrome',EN_MARKER in p.locator('#save-status').inner_text()
        and p.evaluate('document.documentElement.lang')=='en'
        and 'PT' in p.locator('#lang-btn').inner_text()
        and p.locator('#lang-btn').get_attribute('aria-label')=='Switch language to Portuguese'
        and p.evaluate('document.title')=='SDLC Quest v1.3 — Execution lab'
        and p.evaluate("window.__store['sdlc-quest:lang']")=='en')
  check('chrome-en','GUARDIANS OF THE RELEASE' in p.locator('.brand').inner_text()
        and p.locator('#tlc-banner strong').inner_text()=='Your team of four specialists.'
        and p.locator('#harness-banner strong').inner_text()=='Saying you ran it is not enough.'
        and 'A lab for learning, not production access.' in body(p)
        and 'GUARDIÕES DO RELEASE' not in body(p)
        and PT_MARKER not in body(p))
  p.screenshot(path=str(O/'en-home.png'))
  # C3a: toggling back and forth never rewrites the campaign save.
  before=p.evaluate("window.__store['sdlc-quest-save-v1']");xp_before=p.locator('#xp').inner_text()
  p.locator('#lang-btn').click()
  check('progress-preserved-through-toggle',p.evaluate("window.__store['sdlc-quest-save-v1']")==before
        and p.locator('#xp').inner_text()==xp_before
        and p.evaluate('SDLCQuest.getStats().done')==0
        and PT_MARKER in p.locator('#save-status').inner_text())
  p.locator('#lang-btn').click()
  # C10: on an English page the wrong-answer CORE text is English, never the pt-BR core fallback.
  p.locator('[data-stage="0"]').click();p.locator('#start-mission').click()
  press(p,'promise');p.locator('#verify-btn').click()
  feedback=p.locator('#feedback-slot').inner_text()
  check('wrong-answer-feedback-en','The gate held the change.' in feedback
        and 'contract piece(s) missing' in feedback
        and 'Faltam' not in feedback and 'Não atende ao objetivo' not in feedback)
  p.screenshot(path=str(O/'en-feedback.png'))
  # Complete the task, then "reload": new page seeded with the same double contents.
  press(p,'promise',want=False)
  for option in GOLDEN['intent']:press(p,option)
  p.locator('#verify-btn').click()
  check('intent completes in english',p.evaluate('SDLCQuest.getStats().done')==1)
  saved=p.evaluate('window.__store')
  p.close();p=load(b,saved)
  check('lang-persisted-after-reload',EN_MARKER in p.locator('#save-status').inner_text()
        and p.evaluate('document.documentElement.lang')=='en'
        and p.evaluate('SDLCQuest.getStats().done')==1)
  p.close()
  # C9: the single-file artifact embeds both language tables.
  check('singlefile-both-langs',PT_MARKER in H and EN_MARKER in H)
  check('no page errors',not report['errors'])
  check('no runtime HTTP requests',not any(u.startswith(('http:','https:')) for u in report['requests']))
  b.close()
except Exception as exc:
 report['fatal']=str(exc)
 try:p.screenshot(path=str(O/'i18n-failure.png'))
 except Exception:pass
finally:
 report['passed']=len(report['checks'])
 (O/'i18n.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:report.get(k) for k in ['passed','fatal','errors']},ensure_ascii=False))
 if report.get('fatal') or report['errors']:sys.exit(1)
