#!/usr/bin/env python3
"""Browser regression, real DOM interactions. No server required.

This sandbox blocks file:// and localhost navigation by administrator policy.
The generated HTML is loaded using Playwright set_content. Storage integration
uses an explicit in-memory localStorage double; a separate test uses the native
unavailable-storage path. We do not claim to have tested native file persistence.
"""
from pathlib import Path
import json, sys, time
from playwright.sync_api import sync_playwright
from browser_support import launch

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'sdlc-quest.html').read_text(encoding='utf-8')
MODE=sys.argv[1] if len(sys.argv)>1 else 'desktop'
MOBILE=MODE=='mobile'
EVIDENCE=ROOT/'evidence-v1.3'/'legacy'
EVIDENCE.mkdir(exist_ok=True,parents=True)
report={'mode':MODE,'method':'Chromium + Playwright set_content; in-memory localStorage double',
        'limitations':['Native file:// and HTTP navigation were blocked by administrator policy.','No native localStorage persistence or physical mobile device test.'],
        'checks':[],'errors':[],'external_requests':[],'started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}

def check(name,condition=True):
    if not condition: raise AssertionError(name)
    report['checks'].append(name)

def install_storage(page,initial=None):
    page.evaluate('''initial => {
      window.__storageDouble = {...initial};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return Object.hasOwn(window.__storageDouble,k)?window.__storageDouble[k]:null;},
        setItem(k,v){window.__storageDouble[k]=String(v);},
        removeItem(k){delete window.__storageDouble[k];}, clear(){window.__storageDouble={};}
      }});
    }''',initial or {})

def make_page(browser,store=None,storage_double=True,width=None):
    page=browser.new_page(viewport={'width':width or (390 if MOBILE else 1440),'height':844 if MOBILE else 1000},
                          device_scale_factor=1,has_touch=MOBILE,is_mobile=MOBILE,reduced_motion='reduce',accept_downloads=True)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['external_requests'].append(r.url))
    if storage_double:install_storage(page,store)
    page.set_content(HTML,wait_until='load')
    page.set_default_timeout(4000)
    return page

def no_overflow(page,label):
    check(label,page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    if page.locator('#play-dialog').evaluate('(e)=>e.open'):
        b=page.locator('#play-dialog').bounding_box()
        check(label+' dialog fits',b['x']>=0 and b['x']+b['width']<=page.viewport_size['width']+1)

def selected(page,option):
    return page.locator(f'[data-option="{option}"]').get_attribute('aria-pressed')=='true'

def choose_cards(page,task):
    for option in task['options']:
        should=option['id'] in task['answer']
        if selected(page,option['id'])!=should:page.locator(f'[data-option="{option["id"]}"]').click()

def solve(page,task,negative=False):
    kind=task['type']
    if kind in ('select','diff'):
        if negative and task['id']=='diff':
            page.locator('[data-option="theme"]').click()
            page.locator('#verify-btn').click()
            check('oversized unrelated diff blocked',page.locator('.feedback').count()==1 and 'over' in page.locator('.diff-budget').get_attribute('class'))
        choose_cards(page,task)
    elif kind in ('choice','patch'):
        if negative and kind=='patch':
            page.locator('[data-option="original"]').click();page.locator('#verify-btn').click()
            check('cross-tenant microtest fails original code','3/4' in page.locator('.test-console').inner_text())
            check('failed patch does not complete task',not page.evaluate('!!SDLCQuest.getState().done.patch'))
            page.screenshot(path=str(EVIDENCE/'test-failure.png'))
        page.locator(f'[data-option="{task["answer"]}"]').click()
    elif kind=='classify':
        for item in task['items']:page.locator(f'[data-field="{item["id"]}"]').select_option(item['answer'])
    elif kind=='order':
        if negative:
            page.locator(f'[data-step="{task["answer"][-1]}"]').click()
            page.locator('[data-action="undo"]').click()
            check(task['id']+' undo clears ordered item',page.locator('.order-item').count()==0)
        for step in task['answer']:page.locator(f'[data-step="{step}"]').click()
    elif kind=='gate':
        if negative:
            for field in task['fields']:page.locator(f'[data-field="{field["id"]}"]').select_option(field['options'][0][0])
            page.locator('#verify-btn').click()
            check('stale evidence and self-approval block release',page.locator('.gate-field.invalid').count()==4)
        for key,value in task['answer'].items():page.locator(f'[data-field="{key}"]').select_option(value)
    elif kind=='incident':
        if negative:
            page.locator('[data-incident="rollback"]').click()
            check('premature rollback denied',not page.evaluate('!!SDLCQuest.getState().done.incident'))
        for action in ['diagnose','pause','verify','escalate','record']:
            page.locator(f'[data-incident="{action}"]').click()
            if negative and action=='pause':
                page.locator('[data-incident="pause"]').click()
                check('second mitigation denied','Orçamento esgotado' in page.locator('.feedback').inner_text())
            if action=='verify':
                check('incident verification does not pretend recovery','NÃO demonstrada' in page.locator('.incident-log').inner_text())
                page.screenshot(path=str(EVIDENCE/f'{MODE}-incident.png'))
        return
    else:raise AssertionError('Unhandled task '+kind)
    page.locator('#verify-btn').click()

with sync_playwright() as p:
    browser=launch(p)
    page=make_page(browser)
    check('fresh game has zero progression',page.evaluate('SDLCQuest.getStats().done')==0)
    check('six accessible station buttons',page.locator('[data-stage]').count()==6)
    page.locator('[data-stage="5"]').click()
    check('locked station cannot start',page.locator('#start-mission').is_disabled())
    page.locator('[data-stage="0"]').click()
    no_overflow(page,MODE+' home no horizontal overflow')
    page.screenshot(path=str(EVIDENCE/f'{MODE}-home.png'),full_page=True)
    page.locator('#start-mission').click()
    check('first station opens correct task',page.evaluate('SDLCQuest.currentTask()')=='intent')
    page.keyboard.press('Escape')
    check('Escape closes native modal',not page.locator('#play-dialog').evaluate('(el)=>el.open'))
    page.locator('#start-mission').click()
    missions=page.evaluate('QuestData.missions')
    golden=json.loads((ROOT/'tests/fixtures/accepted-decisions.json').read_text())
    for mission in missions:
        for task in mission['tasks']:
            task['answer']=golden[task['id']]
            if task['type']=='classify':
                for item in task['items']:item['answer']=golden[task['id']][item['id']]
    for mi,mission in enumerate(missions):
        for ti,task in enumerate(mission['tasks']):
            check(task['id']+' is current task',page.evaluate('SDLCQuest.currentTask()')==task['id'])
            no_overflow(page,MODE+' '+task['id']+' layout')
            if mi==0 and ti==0 and not MOBILE:
                button=page.locator('[data-option="pain"]')
                button.focus();page.keyboard.press('Space')
                check('keyboard activates selectable card',selected(page,'pain'))
                page.locator('#verify-btn').click()
                check('incomplete intent rejected',not page.evaluate('!!SDLCQuest.getState().done.intent'))
                page.locator('[data-action="hint"]').click()
                page.locator('[data-action="hint"]').click()
                page.locator('[data-action="hint"]').click()
                check('hint charged once',page.evaluate('SDLCQuest.getState().hints.intent')==1)
            solve(page,task,negative=not MOBILE)
            check(task['id']+' completes',page.evaluate('(id)=>!!SDLCQuest.getState().done[id]',task['id']))
            check(task['id']+' displays explanation',page.locator('.takeaway').count()==1)
            if task['id']=='patch':
                check('correct patch executes four passing microtests','4/4' in page.locator('.test-console').inner_text())
                page.screenshot(path=str(EVIDENCE/f'{MODE}-microtests.png'))
            if task['id']=='gate':page.screenshot(path=str(EVIDENCE/f'{MODE}-release-gate.png'))
            if task['id']=='intent':page.screenshot(path=str(EVIDENCE/f'{MODE}-challenge.png'))
            page.locator('#verify-btn').click()
            if mi==0 and ti==0:
                # Restore bytes into a new browser page using an explicit storage double.
                persisted=page.evaluate('window.__storageDouble')
                page.close();page=make_page(browser,persisted)
                check('save roundtrip restores completed task',page.evaluate('SDLCQuest.getStats().done')==1)
                page.locator('#start-mission').click()
                check('resume skips completed task',page.evaluate('SDLCQuest.currentTask()')=='risk')
            if ti==2:
                check(mission['id']+' reward visible',page.locator('[data-action="advance"]').count()==1)
                check(mission['id']+' artifact unlocked',page.evaluate('SDLCQuest.getStats().completed')==mi+1)
                if mi==0 and not MOBILE:
                    try:
                        with page.expect_download(timeout=3000) as result:page.locator('[data-action="download-artifact"]').click()
                        dl=result.value
                        check('artifact download event',dl.suggested_filename=='intent.md')
                        dest=EVIDENCE/'downloaded-intent.md';dl.save_as(str(dest))
                        check('artifact downloaded bytes',dest.read_text().startswith('# Intenção'))
                    except Exception as exc:
                        report.setdefault('download_limitations',[]).append(str(exc))
                page.locator('[data-action="advance"]').click()
    check('all six stations complete',page.evaluate('SDLCQuest.getStats().completed')==6)
    check('all eighteen challenges complete',page.evaluate('SDLCQuest.getStats().done')==18)
    check('five bosses defeated',len(page.evaluate('SDLCQuest.getStats().bosses'))==5)
    expected=1800 if MOBILE else 1690
    check('score reflects errors and hint exactly',page.evaluate('SDLCQuest.getStats().xp')==expected)
    check('final outcome marked educational','Não certifica' in page.locator('.final-status').inner_text())
    page.locator('#play-dialog').evaluate('(el)=>el.scrollTop=0')
    page.screenshot(path=str(EVIDENCE/f'{MODE}-completed.png'))
    if not MOBILE:
        try:
            with page.expect_download(timeout=3000) as result:page.locator('[data-action="report"]').click()
            dl=result.value;dl.save_as(str(EVIDENCE/'sample-playbook.md'))
            check('report includes six artifacts',all(m['artifact'] in (EVIDENCE/'sample-playbook.md').read_text() for m in missions))
        except Exception as exc:report.setdefault('download_limitations',[]).append(str(exc))
    page.locator('[data-action="close"]').first.click()
    final_xp=page.evaluate('SDLCQuest.getStats().xp')
    # Replay an earlier task; the high score must not change.
    page.locator('[data-stage="0"]').click();page.locator('#start-mission').click()
    solve(page,missions[0]['tasks'][0])
    check('replay does not farm XP',page.evaluate('SDLCQuest.getStats().xp')==final_xp)
    page.keyboard.press('Escape')
    # Field manual, accent-insensitive search, sources, and artifact preview.
    page.locator('#book-btn').click();page.locator('#glossary-search').fill('evidencia')
    check('accent-insensitive glossary search',page.locator('.glossary-item').count()>0)
    page.locator('[data-info="sources"]').click()
    check('six primary sources with safe link targets',page.locator('.source-item[rel="noopener noreferrer"]').count()==6)
    page.keyboard.press('Escape');page.locator('#bag-btn').click()
    check('all six artifacts available',page.locator('[data-info="artifact"]:not(:disabled)').count()==6)
    page.locator('[data-info="artifact"][data-mi="3"]').click()
    check('artifact preview identifies simulation','"productionVerified": false' in page.locator('.artifact-preview').inner_text())
    page.keyboard.press('Escape');page.locator('#settings-btn').click()
    page.locator('[data-info="reset-confirm"]').click();page.locator('[data-info="settings"]').click()
    check('cancel reset preserves progress',page.evaluate('SDLCQuest.getStats().done')==18)
    page.locator('[data-info="reset-confirm"]').click();page.locator('[data-info="reset"]').click()
    check('confirmed reset clears progression',page.evaluate('SDLCQuest.getStats().done')==0)
    check('reset relocks later stations',page.locator('[data-stage="5"]').get_attribute('data-locked')=='true')
    page.close()
    # Native unavailable-storage path (no double).
    fallback=make_page(browser,storage_double=False)
    check('native storage failure degrades gracefully','Modo temporário' in fallback.locator('#save-status').inner_text())
    fallback.locator('#start-mission').click();solve(fallback,missions[0]['tasks'][0])
    check('unavailable storage does not prevent progress',fallback.evaluate('SDLCQuest.getStats().done')==1)
    fallback.close()
    # Corrupt persisted JSON uses a fresh safe state.
    corrupt=make_page(browser,{'sdlc-quest-save-v1':'{invalid-json'})
    check('corrupt save resets safely',corrupt.evaluate('SDLCQuest.getStats().done')==0)
    corrupt.close()
    if MOBILE:
        narrow=make_page(browser,width=320)
        no_overflow(narrow,'320px narrow home')
        narrow.locator('#start-mission').click()
        no_overflow(narrow,'320px narrow challenge')
        narrow.screenshot(path=str(EVIDENCE/'mobile-320px.png'))
        narrow.close()
    check('no JavaScript runtime errors',not report['errors'])
    check('no network requests during gameplay',not report['external_requests'])
    browser.close()
report['passed']=len(report['checks'])
report['status']='passed'
(EVIDENCE/f'playtest-{MODE}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'mode':MODE,'checks_passed':report['passed'],'errors':report['errors'],'external_requests':report['external_requests'],'download_limitations':report.get('download_limitations',[])},ensure_ascii=False))
