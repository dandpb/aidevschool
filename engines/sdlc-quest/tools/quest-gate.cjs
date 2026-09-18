#!/usr/bin/env node
'use strict';
/* Runner owned by SDLC Quest. Not an adapter to dandpb/harness-toolkit.
 * Fixed local commands; stop on failure. A local receipt is not a signed attestation.
 * It executes this repository's tests, which are code. Inspect the source before use.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {resolvePython}=require('./python-runtime.cjs');
const ROOT=path.resolve(__dirname,'..');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const STRINGS={
pt:{usage:'Uso: node tools/quest-gate.cjs [--require-release] [--lang pt|en]',help:'Executa contrato local → build → regras → jornadas original/TLC/harness (desktop e mobile) e a jornada de idiomas i18n (desktop).\nSem serviços externos, instalação ou chamada de agentes. Falha interrompe a cadeia.\n--require-release retorna 2 depois dos checks: autorização externa não configurada.\n--lang muda o idioma do console; pt é o padrão.\nNão é um comando do harness-toolkit.',receipt:'Recibo:',done:'Verificações locais concluídas.',incomplete:'Verificações locais incompletas; etapas dependentes não executadas.',toolkit:'Toolkit real: não executado. Revisão independente: não executada. Produção: não autorizada.'},
en:{usage:'Usage: node tools/quest-gate.cjs [--require-release] [--lang pt|en]',help:'Runs the local contract → build → rules → original/TLC/harness journeys (desktop and mobile) and the i18n language journey (desktop).\nNo external services, installs or agent calls. A failure stops the chain.\n--require-release returns 2 after the checks: external authorization is not configured.\n--lang changes the console language; pt is the default.\nNot a harness-toolkit command.',receipt:'Receipt:',done:'Local checks completed.',incomplete:'Local checks incomplete; dependent steps did not run.',toolkit:'Real toolkit: not executed. Independent review: not executed. Production: not authorized.'}
};
function parseArgs(args){
 const valid=new Set(['--help','--require-release']);
 let lang='pt';
 for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--lang'){
   const v=args[i+1];
   if(v!=='pt'&&v!=='en')throw new Error('Argumento não suportado: --lang '+(v===undefined?'':v)+'. Use --lang pt ou --lang en.');
   lang=v;i+=1;
  }else if(!valid.has(a))throw new Error('Argumento não suportado: '+a+'. Não há opção para pular verificações.');
 }
 return {help:args.includes('--help'),requireRelease:args.includes('--require-release'),lang};
}
function command(command,args,cwd,timeoutMs=180000){
 const start=Date.now();
 const r=spawnSync(command,args,{cwd,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'},shell:false,timeout:timeoutMs,maxBuffer:16*1024*1024,detached:process.platform!=='win32',killSignal:'SIGKILL'});
 if(r.error&&r.pid&&process.platform!=='win32'){try{process.kill(-r.pid,'SIGKILL');}catch{}}
 return {command:[command,...args],passed:!r.error&&r.status===0,exitCode:r.status,signal:r.signal??null,error:r.error?{code:r.error.code||'EXECUTION_ERROR',message:r.error.message}:null,elapsedMs:Date.now()-start,stdout:r.stdout||'',stderr:r.stderr||''};
}
function snapshot(root){
 const files=[];
 function walk(rel){const full=path.join(root,rel);if(!fs.existsSync(full))throw new Error('Entrada ausente: '+rel);
  const st=fs.lstatSync(full);if(st.isSymbolicLink())throw new Error('Link simbólico não aceito como entrada: '+rel);
  if(st.isDirectory()){for(const name of fs.readdirSync(full).sort())if(name!=='__pycache__')walk(path.join(rel,name));}
  else if(/\.(?:js|cjs|py|json|css|html|md|txt)$/.test(rel))files.push({path:rel.split(path.sep).join('/'),sha256:sha(fs.readFileSync(full))});
 }
 for(const target of ['src','tests','tools','docs/harness','index.html','package.json','requirements-dev.txt'])walk(target);
 files.sort((a,b)=>a.path.localeCompare(b.path));return {sha256:sha(JSON.stringify(files)),files};
}
function validateContract(root){
 const c=JSON.parse(fs.readFileSync(path.join(root,'docs/harness/contract.json'),'utf8'));
 if(c.schemaVersion!==1||c.changeId!=='QUEST-013')throw new Error('Contrato local incompatível.');
 if(c.sourceRepository?.inspected!==false||c.sourceRepository?.adapterStatus!=='pending-source-access')throw new Error('Estado da integração real diverge desta versão do Quest.');
 const ids=c.acceptance?.map(a=>a.id);
 if(!Array.isArray(ids)||new Set(ids).size!==10||!Array.from({length:10},(_,i)=>'H'+String(i+1).padStart(2,'0')).every(id=>ids.includes(id)))throw new Error('Critérios esperados ausentes ou duplicados.');
 for(const a of c.acceptance){if(typeof a.behavior!=='string'||!Array.isArray(a.tests)||!a.tests.length)throw new Error('Critério sem comportamento/check.');
  for(const f of a.tests)if(!/^tests\/[\w.-]+$/.test(f)||!fs.existsSync(path.join(root,f)))throw new Error('Arquivo de teste ausente ou inválido: '+f);
 }
 return {checks:10,scope:'Presença, estrutura e referências dos critérios. Não autentica aprovação humana nem a qualidade semântica do contrato.'};
}
function releaseExitCode(checksPassed,requireRelease){return !checksPassed?1:requireRelease?2:0;}
function main(args){
 let flags;try{flags=parseArgs(args);}catch(e){console.error(e.message);return 64;}
 const S=STRINGS[flags.lang];
 if(flags.help){console.log(S.usage+'\n'+S.help);return 0;}
 const runId='local-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
 const dir=path.join(ROOT,'evidence-v1.3','runs',runId);fs.mkdirSync(dir,{recursive:true});
 const receipt={schema:'quest-local-gate/v1',runId,startedAt:new Date().toISOString(),origin:'SDLC Quest own runner',sourceRepository:{url:'https://github.com/dandpb/harness-toolkit',inspected:false,adapterExecuted:false},trust:'local-unattested',steps:[],localChecksCompleted:false,independentReview:'not-executed',productionAuthorized:false,releaseGate:'not-configured',limitations:['O candidato e o runner estão no mesmo ambiente editável.','Hashes detectam divergências; não autenticam um executor confiável.','Jornadas usam set_content e localStorage em memória; não validam file:// nativo.']};
 const save=()=>fs.writeFileSync(path.join(dir,'run.json'),JSON.stringify(receipt,null,2)+'\n');save();
 let ok=true;
 try{
  receipt.sourceBefore=snapshot(ROOT);save();
  const input=validateContract(ROOT);receipt.steps.push({id:'contract-shape',status:'passed',...input});save();
  const tests=fs.readdirSync(path.join(ROOT,'tests')).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f);
  if(!tests.length)throw new Error('Nenhum arquivo de teste encontrado.');
  const python=resolvePython(ROOT);
  const steps=[
   ['build',process.execPath,['tools/build.cjs']],
   ['rules',process.execPath,['--test',...tests]],
   ['campaign-desktop',python.executable,[...python.args,'tests/playtest.py','desktop']],
   ['campaign-mobile',python.executable,[...python.args,'tests/playtest.py','mobile']],
   ['tlc-desktop',python.executable,[...python.args,'tests/tlc-browser.py','desktop']],
   ['tlc-mobile',python.executable,[...python.args,'tests/tlc-browser.py','mobile']],
   ['harness-desktop',python.executable,[...python.args,'tests/harness-browser.py','desktop']],
   ['harness-mobile',python.executable,[...python.args,'tests/harness-browser.py','mobile']],
   ['i18n',python.executable,[...python.args,'tests/i18n-browser.py','desktop']]
  ];
  for(const [id,cmd,argv] of steps){
   const startedAt=new Date().toISOString(),entry={id,status:'running',startedAt,command:[cmd,...argv]};receipt.steps.push(entry);save();console.log('RUN',id);
   const result=command(cmd,argv,ROOT);
   const text='$ '+[cmd,...argv].join(' ')+'\n\nSTDOUT\n'+result.stdout+'\nSTDERR\n'+result.stderr+'\n';
   fs.writeFileSync(path.join(dir,id+'.log'),text);
   Object.assign(entry,{status:result.passed?'passed':'failed',endedAt:new Date().toISOString(),exitCode:result.exitCode,signal:result.signal,error:result.error,elapsedMs:result.elapsedMs,log:id+'.log',logSha256:sha(text)});save();console.log(entry.status.toUpperCase(),id,entry.exitCode);
   if(!result.passed){ok=false;break;}
  }
  receipt.sourceAfter=snapshot(ROOT);receipt.inputsUnchanged=receipt.sourceBefore.sha256===receipt.sourceAfter.sha256;
  if(!receipt.inputsUnchanged){ok=false;receipt.errors=['As entradas mudaram durante a execução. Refaça a verificação da revisão final.'];}
  const candidate=path.join(ROOT,'sdlc-quest.html');if(fs.existsSync(candidate))receipt.candidate={file:'sdlc-quest.html',sha256:sha(fs.readFileSync(candidate)),bytes:fs.statSync(candidate).size};
 }catch(e){ok=false;receipt.errors=[e.message];}
 receipt.localChecksCompleted=ok;receipt.finishedAt=new Date().toISOString();receipt.requestedRelease=flags.requireRelease;receipt.exitCode=releaseExitCode(ok,flags.requireRelease);save();
 console.log(S.receipt,path.relative(ROOT,path.join(dir,'run.json')));
 console.log(ok?S.done:S.incomplete);
 console.log(S.toolkit);
 return receipt.exitCode;
}
if(require.main===module)process.exitCode=main(process.argv.slice(2));
module.exports={parseArgs,command,snapshot,validateContract,releaseExitCode,main};
