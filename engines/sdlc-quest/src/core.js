/* Pure game rules, independent of DOM/canvas. No eval, network, or external credentials. */
(function(root){
'use strict';
const TLC=typeof module==='object'&&module.exports?require('./tlc-core.js'):root.QuestTLC;
const H=typeof module==='object'&&module.exports?require('./harness-core.js'):root.QuestHarness;
const VERSION=1;
const key='sdlc-quest-save-v1';
const empty=()=>({version:VERSION,tlc:TLC.empty(),harness:H.emptyDraft(),done:{},attempts:{},hints:{},drafts:{},transfer:{},sound:false,motion:true,selected:0,startedAt:new Date().toISOString()});
const equalSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
function score(attempts=0,hints=0){return Math.max(40,100-15*Math.max(0,attempts)-20*Math.min(1,Math.max(0,hints)));}
function validate(task,answer){
 if(!task)return {ok:false,message:'Desafio desconhecido.'};
 let ok=false, details=[];
 switch(task.type){
  case 'select': case 'diff':
   ok=equalSet(answer,task.answer);
   if(Array.isArray(answer)){
    const validIds=new Set(task.options.map(o=>o.id));
    if(answer.some(id=>!validIds.has(id)))ok=false;
    if(task.type==='diff'){
     const lines=task.options.filter(x=>answer.includes(x.id)).reduce((s,x)=>s+x.lines,0);
     if(lines>task.budget)details.push(`O recorte soma ${lines} linhas; o limite didático é ${task.budget}.`);
     ok=ok&&lines<=task.budget;
    }
   }
   if(!ok&&Array.isArray(answer)){
    const wrong=task.options.filter(o=>answer.includes(o.id)&&!task.answer.includes(o.id));
    for(const o of wrong)details.push(`${o.label}: ${o.why||'Não atende ao objetivo desta mudança.'}`);
    const missing=task.answer.filter(id=>!answer.includes(id)).length;
    if(missing)details.push(`Faltam ${missing} peça(s) do contrato. Consulte o conceito gratuito e reveja os critérios.`);
    if(!wrong.length&&!missing)details.push('Há uma seleção inválida ou duplicada. Revise os cartões.');
   }
   break;
  case 'classify':
   ok=!!answer&&typeof answer==='object'&&!Array.isArray(answer)&&task.items.every(item=>answer[item.id]===item.answer);
   if(!ok)task.items.filter(item=>!answer||answer[item.id]!==item.answer).forEach(item=>details.push(item.text));
   break;
  case 'order':
   ok=Array.isArray(answer)&&answer.length===task.answer.length&&answer.every((x,i)=>x===task.answer[i]);
   if(!ok)details.push('Revise a sequência: cada etapa precisa da saída da anterior.');
   break;
  case 'choice':
   ok=answer===task.answer;
   if(!ok)details.push(task.options.find(o=>o.id===answer)?.why||'Escolha uma ação antes de confirmar.');
   break;
  case 'patch':{
   const results=runPatch(answer);
   ok=answer===task.answer&&results.every(x=>x.pass);
   if(!ok)details.push(['skip','expect'].includes(answer)?'O verificador protegido recusou a mudança das regras. Os testes continuam detectando o defeito.':'A busca atual ainda permite encontrar dados de outro tenant.');
   break;
  }
  case 'gate':
   ok=!!answer&&typeof answer==='object'&&Object.entries(task.answer).every(([k,v])=>answer[k]===v);
   if(!ok){for(const field of task.fields)if(!answer||answer[field.id]!==task.answer[field.id])details.push(`Corrigir: ${field.label}.`);}
   break;
  case 'incident':ok=answer?.phase==='complete'&&answer?.actions===1;break;
 }
 return {ok,message:ok?task.success:details.join(' '),details};
}
const rows=Object.freeze([Object.freeze({id:'evt-A',tenant:'A'}),Object.freeze({id:'evt-B',tenant:'B'})]);
function runPatch(patch){
 const lookup=(id,tenant)=>rows.find(row=>row.id===id&&(patch==='scoped'?row.tenant===tenant:true))??null;
 const cases=[
  {label:'Tenant A encontra entrega A',id:'evt-A',tenant:'A',expect:'A'},
  {label:'Tenant A não encontra entrega B',id:'evt-B',tenant:'A',expect:null},
  {label:'Tenant B encontra entrega B',id:'evt-B',tenant:'B',expect:'B'},
  {label:'ID inexistente não retorna uma entrega',id:'absent',tenant:'A',expect:null}
 ];
 return cases.map(c=>{const actual=lookup(c.id,c.tenant)?.tenant??null;return {label:c.label,pass:actual===c.expect,expected:c.expect,actual};});
}
function freshIncident(){return {phase:'alert',actions:0,log:['03:07 · Alerta fictício: taxa de falhas acima do objetivo.'],burn:8};}
function stepIncident(current,action){
 const s=JSON.parse(JSON.stringify(current||freshIncident()));
 const paths={alert:['diagnose','diagnosed'],diagnosed:['pause','mitigated'],mitigated:['verify','verified'],verified:['escalate','escalated'],escalated:['record','complete']};
 const messages={
  diagnose:'03:08 · Telemetria válida. Destino lento. Migração incompatível com rollback. Runbook autoriza pausar novos retries uma única vez.',
  pause:'03:09 · Fila de novos retries pausada. Mitigação 1/1 usada; trabalhos já em andamento continuam.',
  verify:'03:10 · Nova amostra: degradação persiste. Recuperação NÃO demonstrada. Não repetir mitigação automaticamente.',
  escalate:'03:11 · Plantonista acionado. Evidências e limites enviados. Incidente continua aberto sob responsabilidade humana.',
  record:'03:12 · Nova intenção registrada: investigar timeouts e prevenir recorrência. Causa ainda é hipótese.'
 };
 if(s.phase==='complete')return {state:s,ok:false,done:true,message:'O incidente já foi encaminhado e registrado.'};
 if(action==='rollback')return {state:s,ok:false,done:false,message:s.phase==='alert'?'Você ainda não diagnosticou nem verificou a compatibilidade. Uma anomalia não autoriza rollback.':'Rollback negado: a migração deste cenário é incompatível. Não transforme diagnóstico em permissão.'};
 const next=paths[s.phase];
 if(!next||action!==next[0]){
  let message='A ação não atende às precondições atuais. Leia a telemetria e o estado do incidente.';
  if(action==='pause'&&s.actions>=1)message='Orçamento esgotado: uma mitigação já foi aplicada. Verifique o resultado e escale; não entre em loop.';
  if(action==='record')message='Preserve a timeline, mas ainda é preciso mitigar dentro do runbook, verificar e escalar este incidente.';
  if(action==='escalate'&&s.phase==='alert')message='Neste cenário há um runbook válido. Primeiro valide os sinais. Em situações reais, escalar cedo pode ser apropriado; esta missão exercita a sequência limitada.';
  return {state:s,ok:false,done:false,message};
 }
 s.phase=next[1];s.log.push(messages[action]);
 if(action==='pause'){s.actions=1;s.burn=5;}
 if(action==='verify')s.burn=4;
 return {state:s,ok:true,done:s.phase==='complete',message:messages[action]};
}
// A phase may be persisted, but its log, metrics and budget are always rebuilt from the scenario.
function restoreIncident(raw){
 const phases=['alert','diagnosed','mitigated','verified','escalated','complete'];
 const index=phases.indexOf(raw?.phase);let s=freshIncident();
 if(index<0)return s;
 for(const action of ['diagnose','pause','verify','escalate','record'].slice(0,index))s=stepIncident(s,action).state;
 return s;
}
function hasAnswer(task,answer){
 if(!task)return false;
 if(['select','diff','order'].includes(task.type))return Array.isArray(answer)&&answer.length>0;
 if(['classify','gate'].includes(task.type))return !!answer&&typeof answer==='object'&&Object.values(answer).some(v=>typeof v==='string'&&v.length>0);
 if(task.type==='incident')return !!answer&&answer.phase!=='alert';
 return typeof answer==='string'&&answer.length>0;
}
const transferKeys=['intent','evidence','authority','stop'];
function makeBackup(state,data){return {format:'sdlc-quest-backup',backupVersion:1,appVersion:'1.3.0',createdAt:new Date().toISOString(),state:normalize(state,data)};}
function importBackup(text,data){
 if(typeof text!=='string'||text.length>262144)throw new Error('Backup muito grande. O limite é 256 KiB.');
 let raw;try{raw=JSON.parse(text);}catch{throw new Error('O arquivo não contém JSON válido.');}
 if(!raw||raw.format!=='sdlc-quest-backup'||raw.backupVersion!==1)throw new Error('Formato ou versão de backup incompatível. Use o backup JSON do SDLC Quest.');
 if(!raw.state||Array.isArray(raw.state)||typeof raw.state!=='object'||raw.state.version!==VERSION)throw new Error('O backup não contém um progresso compatível.');
 for(const name of ['done','attempts','hints','drafts','transfer'])if(raw.state[name]!==undefined&&(!raw.state[name]||typeof raw.state[name]!=='object'||Array.isArray(raw.state[name])))throw new Error('Estrutura de progresso inválida: '+name+'.');
 return normalize(raw.state,data);
}
function normalize(raw,data){
 const s=empty();if(!raw||typeof raw!=='object'||raw.version!==VERSION)return s;
 s.tlc=TLC.normalize(raw.tlc);
 s.harness=H.normalizeDraft(raw.harness);
 const tasks=data.missions.flatMap(m=>m.tasks),ids=new Set(tasks.map(t=>t.id));
 for(const k of transferKeys)s.transfer[k]=typeof raw.transfer?.[k]==='string'?raw.transfer[k].slice(0,1600):'';
 s.sound=raw.sound===true;s.motion=raw.motion!==false;s.selected=Number.isInteger(raw.selected)?Math.max(0,Math.min(5,raw.selected)):0;
 if(typeof raw.startedAt==='string'&&!Number.isNaN(Date.parse(raw.startedAt)))s.startedAt=raw.startedAt;
 for(const id of ids){
  s.attempts[id]=Number.isInteger(raw.attempts?.[id])?Math.max(0,Math.min(10000,raw.attempts[id])):0;
  s.hints[id]=raw.hints?.[id]?1:0;
  if(raw.done?.[id]&&typeof raw.done[id]==='object')s.done[id]={score:score(s.attempts[id],s.hints[id]),at:typeof raw.done[id].at==='string'?raw.done[id].at:'restored'};
 }
 // Only restore a contiguous progression: later missions cannot unlock by a stray flag.
 let blocked=false;
 for(const task of tasks){if(blocked)delete s.done[task.id];else if(!s.done[task.id])blocked=true;}
 // Drafts are UI conveniences, never evidence of a completed task.
 if(raw.drafts&&typeof raw.drafts==='object')for(const id of ids){
  const t=tasks.find(x=>x.id===id),v=raw.drafts[id];
  if(t.type==='incident'&&v&&typeof v==='object')s.drafts[id]=restoreIncident(v);
  else if(['select','diff','order'].includes(t.type)&&Array.isArray(v))s.drafts[id]=[...new Set(v.filter(x=>typeof x==='string'&&(t.options||t.steps).some(o=>o.id===x)))];
  else if(['choice','patch'].includes(t.type)&&typeof v==='string'&&t.options.some(o=>o.id===v))s.drafts[id]=v;
  else if(['classify','gate'].includes(t.type)&&v&&typeof v==='object'&&!Array.isArray(v)){
   s.drafts[id]={};
   if(t.type==='classify')for(const item of t.items){if(t.groups.some(g=>g[0]===v[item.id]))s.drafts[id][item.id]=v[item.id];}
   else for(const f of t.fields){if(f.options.some(o=>o[0]===v[f.id]))s.drafts[id][f.id]=v[f.id];}
  }
 }
 return s;
}
function stats(s,data){
 const completed=data.missions.filter(m=>m.tasks.every(t=>s.done[t.id])).length;
 const total=data.missions.reduce((n,m)=>n+m.tasks.length,0);
 const done=Object.keys(s.done).filter(id=>data.missions.some(m=>m.tasks.some(t=>t.id===id))).length;
 const xp=Object.values(s.done).reduce((sum,x)=>sum+x.score,0);
 const axes={intent:{done:0,total:0},evidence:{done:0,total:0},authority:{done:0,total:0}};
 for(const m of data.missions)for(const t of m.tasks){axes[t.axis].total++;if(s.done[t.id])axes[t.axis].done++;}
 const bosses=data.missions.flatMap(m=>m.tasks).filter(t=>t.boss&&s.done[t.id]).map(t=>t.boss);
 return {completed,done,total,xp,axes,bosses};
}
function canOpen(s,data,index){return Number.isInteger(index)&&index>=0&&index<data.missions.length&&data.missions.slice(0,index).every(m=>m.tasks.every(t=>s.done[t.id]));}
function complete(s,data,task,answer){
 const idx=data.missions.findIndex(m=>m.tasks.some(t=>t.id===task.id));
 if(idx<0||!canOpen(s,data,idx))return {ok:false,message:'Conclua as etapas anteriores.'};
 const taskIdx=data.missions[idx].tasks.findIndex(t=>t.id===task.id);
 if(!data.missions[idx].tasks.slice(0,taskIdx).every(t=>s.done[t.id]))return {ok:false,message:'Conclua o desafio anterior desta missão.'};
 const result=validate(task,answer);
 if(result.ok&&!s.done[task.id])s.done[task.id]={score:score(s.attempts[task.id],s.hints[task.id]),at:new Date().toISOString()};
 return result;
}
function shuffled(array,seed){
 const a=[...array];let h=0;for(const char of String(seed))h=(Math.imul(h,31)+char.charCodeAt(0))|0;
 for(let i=a.length-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);[a[i],a[j]]=[a[j],a[i]];}
 return a;
}
const core={VERSION,key,empty,hasAnswer,restoreIncident,makeBackup,importBackup,transferKeys,equalSet,score,validate,runPatch,freshIncident,stepIncident,normalize,stats,canOpen,complete,shuffled};
if(typeof module==='object'&&module.exports)module.exports=core;else root.QuestCore=core;
})(typeof globalThis!=='undefined'?globalThis:this);
