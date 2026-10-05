"""Freeze a synthetic domain corpus; never read labels from the historical test."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT/'catalog.json').read_text())
# Each split uses a different wording family. These are synthetic, correlated domain examples.
GOALS = [
 ('aiDevschoolMvp','practice AI concepts in a guided conversation with verification scripts','praticar conceitos de IA numa conversa guiada com scripts de verificação'),
 ('codexDojo','view my completed units and learning evidence in a dashboard','consultar unidades e evidências de aprendizagem num painel'),
 ('codexdojo-os-prototype','study with missions, a terminal and a mentor in one learning environment','estudar num ambiente com missões, terminal e mentor'),
 ('dojoToday','find the next programming practice and my daily reviews','encontrar a próxima prática de programação e minhas revisões diárias'),
 ('literacyDojo','learn artificial intelligence through tiny lessons without coding','aprender inteligência artificial por pequenas lições sem programar'),
 ('miniMaxEvolutionEngine','use a Claude Code agent workflow to implement and verify software','usar um fluxo de agentes Claude Code para implementar e verificar software'),
 ('minimaxDojo','receive programming tutoring from several agents and a shared whiteboard','receber tutoria de programação com vários agentes e um quadro compartilhado'),
 ('miniTown','explore a welcoming town without assessed activities','explorar uma cidade acolhedora sem atividades avaliadas'),
 ('openclaw','follow a file based execution checklist in a simulate and grade cycle','seguir um checklist de execução em arquivos num ciclo de simulação e avaliação'),
 ('pixelDojo','learn programming by playing two dimensional pixel games','aprender programação jogando jogos bidimensionais de pixels'),
 ('sdlc-quest','practice the software development lifecycle in a Portuguese teaching game','praticar o ciclo de desenvolvimento de software num jogo didático em português'),
 ('voxelDojo','explore three dimensional simulations of algorithms and systems','explorar simulações tridimensionais de algoritmos e sistemas'),
 ('zai-duolingo-like','study AI literacy in a gamified course with short activities','estudar letramento em IA num curso gamificado com atividades curtas'),
]
SCORE = {'match': {'type':'score','instructions':'How well does the documented engine capability address the learning goal? Use only the stated capability.',
 'criteria':['Unrelated or unsupported','Weak connection','Partially addresses the goal','Directly addresses the goal']}}
TRIAGE = {
 'department':{'type':'choice','instructions':'Which department owns the current request?', 'criteria':{'billing':'Invoices, payments and refunds','technical':'Software defects and service outages','other':'General information'}},
 'urgency':{'type':'score','instructions':'Rate the explicit deadline of the current request.', 'criteria':['No deadline','Within the coming week','Right now or today']},
 'cancel':{'type':'noul','instructions':'Does the customer currently intend or threaten to cancel the service?', 'criteria':{'false':'No active cancellation intention; includes an explicit denial or retraction','true':'An active intention or threat to cancel or stop using the service'}}}
SENTIMENT = {
 'sentiment':{'type':'choice','instructions':'What is the author sentiment toward the service?', 'criteria':{'negative':'Criticism or dissatisfaction','neutral':'Facts without approval or disapproval','positive':'Praise or satisfaction'}},
 'rating':{'type':'score','instructions':'Rate the author sentiment toward the service.', 'criteria':['Negative','Neutral','Positive']},
 'positive':{'type':'noul','instructions':'Does the author express positive sentiment?', 'criteria':{'false':'Neutral facts or negative sentiment','true':'Positive approval or praise'}}}
rows = {s:[] for s in ('train','calibration','test')}
def add(split, cid, family, suite, language, state, questions, expected=None, target=None, group=None):
 rows[split].append({'id':cid,'split':split,'family':family,'suite':suite,'language':language,'state':state,'questions':questions,'expected':expected or {},'target_engine':target,'goal_group':group})

for split in rows:
 for i,(target,en,pt) in enumerate(GOALS):
  target_index = next(j for j,e in enumerate(CATALOG) if e['id']==target)
  candidates = list(range(13)) if split=='test' else ([target_index,(target_index+1)%13,(target_index+5)%13,(target_index+9)%13] if split=='train' else [target_index,(target_index+3)%13,(target_index+8)%13])
  variants = range(2) if split=='train' else range(1)
  for lang,goal in [('en',en),('pt',pt)]:
   for variant in variants:
    if split=='train':
     text=(('I want to '+goal+'.') if variant==0 else ('My study objective is to '+goal+'.')) if lang=='en' else (('Quero '+goal+'.') if variant==0 else ('Meu objetivo de estudo é '+goal+'.'))
    elif split=='calibration':
     text=('Which learning environment would help me '+goal+'?') if lang=='en' else ('Qual ambiente de aprendizagem me ajudaria a '+goal+'?')
    else:
     text=('For my next learning session, I need to '+goal+'. Please point me toward suitable documented capabilities.') if lang=='en' else ('Na próxima sessão de aprendizagem, preciso '+goal+'. Procuro capacidades documentadas adequadas para isso.')
    for j in candidates:
     engine=CATALOG[j]
     add(split,f'{split}-recommend-{i}-{lang}-{variant}-{j}',f'{split}-recommend-wording','recommendation',lang,
         {'learning_goal':text,'engine_capability':engine['description']},SCORE,target=target,group=f'{split}-{i}-{lang}-{variant}')
     rows[split][-1]['candidate_engine']=engine['id']
 issues = [('billing','My monthly payment was debited twice.','Meu pagamento mensal foi debitado duas vezes.'),
           ('technical','The editor fails to save my changes.','O editor não consegue salvar minhas alterações.'),
           ('other','Please tell me your office address.','Informe o endereço do seu escritório.')]
 deadlines = [('No deadline; handle it when possible.','Sem prazo; resolva quando possível.'),('Please handle this during the next week.','Resolva durante a próxima semana.'),('This must be handled today without delay.','Precisa ser resolvido hoje sem demora.')]
 for i in range(12 if split=='train' else 6):
  department,en,pt=issues[i%3];urgency=(i//3)%3;cancel=bool(i%2)
  for lang,base in [('en',en),('pt',pt)]:
   deadline=deadlines[urgency][0 if lang=='en' else 1]
   intent=('I will cancel my account.' if cancel else 'I will keep my account; do not cancel it.') if lang=='en' else ('Vou cancelar minha conta.' if cancel else 'Vou manter minha conta; não a cancele.')
   prefix={'train':('Support request: ','Pedido ao suporte: '),'calibration':('The customer wrote the following message. ','O cliente escreveu a seguinte mensagem. '),'test':('New customer ticket, please interpret the current position: ','Novo chamado do cliente, interprete a posição atual: ')}[split][0 if lang=='en' else 1]
   add(split,f'{split}-triage-{i}-{lang}',f'{split}-triage-wording','triage',lang,prefix+base+' '+deadline+' '+intent,TRIAGE,{'department':department,'urgency':urgency,'cancel':cancel})
 sentiments=[('The service is awful and disappointing.','O serviço é péssimo e decepcionante.',0),('The service opens at nine in the morning.','O serviço abre às nove da manhã.',1),('The service is wonderful and makes me happy.','O serviço é maravilhoso e me deixa feliz.',2),('Although I first liked it, now it is awful.','Embora eu tenha gostado antes, agora é péssimo.',0),('I used to dislike it but now I really love it.','Eu não gostava antes, mas agora adoro.',2),('The plan has three available tiers.','O plano tem três modalidades disponíveis.',1)]
 for i,(en,pt,label) in enumerate(sentiments):
  if split=='calibration' and i>=4:continue
  for lang,base in [('en',en),('pt',pt)]:
   prefix={'train':('User feedback: ','Opinião do usuário: '),'calibration':('A customer review reads: ','Uma avaliação do cliente diz: '),'test':('Here is the latest opinion about the service: ','Esta é a opinião mais recente sobre o serviço: ')}[split][0 if lang=='en' else 1]
   add(split,f'{split}-sentiment-{i}-{lang}',f'{split}-sentiment-wording','sentiment',lang,prefix+base,SENTIMENT,{'sentiment':['negative','neutral','positive'][label],'rating':label,'positive':label==2})

seen_states={};families={}
for split,data in rows.items():
 for row in data:
  text=json.dumps(row['state'],sort_keys=True,ensure_ascii=False)
  digest=hashlib.sha256(text.encode()).hexdigest()
  if digest in seen_states and seen_states[digest]!=split:raise ValueError('Cross-split identical state')
  seen_states[digest]=split
  if row['family'] in families and families[row['family']]!=split:raise ValueError('Cross-split family')
  families[row['family']]=split
 path=ROOT/(split+'.jsonl')
 if path.exists():raise SystemExit(f'Refusing overwrite: {path}')
 path.write_text(''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in data))
metadata={'source':'hand-authored synthetic templates and repository catalog','limitations':['Split wording families differ, but underlying intents and many component sentences are shared. This is a correlated synthetic test, not real-world generalization.','Recommendation top-1 reference expresses a intended engine; suitability scores will be teacher distributions, not independently adjudicated labels.'],
          'splits':{split:{'rows':len(data),'questions':sum(len(r['questions']) for r in data),'sha256':hashlib.sha256((ROOT/(split+'.jsonl')).read_bytes()).hexdigest()} for split,data in rows.items()}}
(ROOT/'data-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metadata['splits'],indent=2))
