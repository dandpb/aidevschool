'use strict';
// C4: the QuestLang resolver must fall back to the pt-BR field when an `_en` variant is missing,
// and never render a raw key, "undefined", or drop content that exists. Explicit lang argument; no DOM.
const test=require('node:test'),a=require('node:assert/strict');
const L=require('../src/lang.js');
test('fallback renders pt-BR when _en is missing',()=>{
 const record={label:'Promessa absoluta',why:'Sem evidência.'};          // no label_en / why_en
 a.equal(L.field(record,'label','en'),'Promessa absoluta');
 a.equal(L.field(record,'why','en'),'Sem evidência.');
 a.equal(L.field(record,'label','pt'),'Promessa absoluta');             // explicit pt unchanged
 const partial={label:'Escopo',label_en:'Scope',why:'Limite do trabalho.'}; // mixed: only one _en present
 a.equal(L.field(partial,'label','en'),'Scope');
 a.equal(L.field(partial,'why','en'),'Limite do trabalho.');
 const nested={stage:'Estação 1',stage_en:'Station 1'};
 a.equal(L.field(nested,'stage','en'),'Station 1');
});
test('resolver never returns a raw key or leaks absence as text',()=>{
  a.equal(L.field({}, 'label','en'),'');                                // absent field: esc-safe empty string, never the key or "undefined"
  a.notEqual(L.field({label:'x'},'label','en'),'label');                 // no key leakage
  a.equal(L.t({pt:{k:'valor'},en:{}},'k','en'),'valor');                 // t() falls back to the pt table
  a.equal(L.t({pt:{k:'valor'},en:{}},'k','pt'),'valor');
  a.equal(L.t({pt:{},en:{}},'missing','en'),'');                         // absent key: empty string, not undefined
});
test('t() resolves the chrome superset: strings, functions, sub-tables',()=>{
  a.equal(L.t({pt:{k:'valor'},en:{k:'value'}},'k','en'),'value');        // string entry from the active table
  a.equal(L.t({pt:{greet:n=>`olá ${n}`},en:{greet:n=>`hello ${n}`}},'greet','en','world'),'hello world'); // function entry called with args (T() pattern)
  a.deepEqual(L.t({pt:{ranks:{a:'X'}},en:{ranks:{a:'Y'}}},'ranks','en'),{a:'Y'}); // sub-table resolves raw for the caller (SN() pattern)
  a.equal(L.t({pt:{greet:n=>`olá ${n}`}},'greet','en','mundo'),'olá mundo'); // function entry falls back to pt
  a.equal(L.t({pt:{k:'valor'},en:{}},'k','en'),'valor');                 // pt fallback still holds
  a.equal(L.t({pt:{},en:{}},'missing','pt'),'');                         // absent key: '' on both paths
});

// C6/C7: anti-drift parity walker. Every displayable PT field in data.js and tlc-data.js must
// carry an _en sibling; every [id,label] tuple gains its EN label as a 3rd element; glossary
// entries are [term,def,term_en,def_en]. The exclusion list is the Landing literal plus the
// mechanical keys (code/axis/skill/source) that are out of scope by design: code snippets are
// pt-BR teaching fixtures, axis/skill/source are language-neutral identifiers; sources[].name
// is a proper noun and is scope-skipped, not globally excluded.
const questData=require("../src/data.js");
const tlcData=require("../src/tlc-data.js");
const EXCLUDE=new Set(["id","url","color","glyph","artifact","answer","type","boss","lines","budget","tag","version","checkedAt","install","flow","license","code","axis","skill","source"]);
const PROPER_NOUNS={sources:["name"]};
function needEn(node,where,id,field,out){const en=node[field];if(typeof en!=="string"||!en.length)out.push({where,id,field});}
function walkRecord(node,where,out,ctx={}){
 const id=typeof node.id==="string"&&node.id?node.id:(ctx.id||null);
 for(const key of Object.keys(node)){
  if(key==="_en"||key.endsWith("_en")||EXCLUDE.has(key))continue;
  if(ctx.skip&&ctx.skip.includes(key))continue;
  const value=node[key];
  if(typeof value==="string"){if(value.length)needEn(node,`${where}.${key}`,id,`${key}_en`,out);continue;}
  if(Array.isArray(value)){
   if(!value.length)continue;
   if(value.every(x=>Array.isArray(x))){
    value.forEach((tuple,index)=>{
     if(tuple.length<2||typeof tuple[1]!=="string")return;
     const en=tuple[2];
     if(typeof en!=="string"||!en.length)out.push({where:`${where}.${key}[${index}]`,id:typeof tuple[0]==="string"?tuple[0]:null,field:"label_en"});
    });continue;
   }
   if(value.every(x=>x!==null&&typeof x==="object"))value.forEach((rec,index)=>walkRecord(rec,`${where}.${key}[${index}]`,out,{}));
   continue;
  }
  if(value!==null&&typeof value==="object")walkRecord(value,`${where}.${key}`,out,{});
 }
}
function walkTuples(list,where,out){
 list.forEach((entry,index)=>{
  const [term,def,termEn,defEn]=entry;
  if(typeof term==="string"&&term.length&&!(typeof termEn==="string"&&termEn.length))out.push({where:`${where}[${index}]`,id:term,field:"term_en"});
  if(typeof def==="string"&&def.length&&!(typeof defEn==="string"&&defEn.length))out.push({where:`${where}[${index}]`,id:term,field:"text_en"});
 });
}
function parityReport(data){
 const out=[];
 (data.missions||[]).forEach((m,i)=>walkRecord(m,`missions[${i}]`,out));
 if(Array.isArray(data.glossary))walkTuples(data.glossary,"glossary",out);
 (data.sources||[]).forEach((s,i)=>walkRecord(s,`sources[${i}]`,out,{skip:PROPER_NOUNS.sources}));
 Object.entries(data.primers||{}).forEach(([k,p])=>walkRecord(p,`primers.${k}`,out,{id:k}));
 if(Array.isArray(data.modules))data.modules.forEach((m,i)=>walkRecord(m,`modules[${i}]`,out));
 if(typeof data.notice==="string"&&data.notice.length)needEn(data,"tlc.notice",null,"notice_en",out);
 return out;
}
const fmt=f=>f.where+(f.id?` #${f.id}`:"")+": "+f.field;
test("walker reports record id and missing field",()=>{
 const data=structuredClone(questData);
 delete data.missions[0].brief_en;
 const report=parityReport(data);
 a.equal(report.length,1);
 const text=report.map(fmt).join("\n");
 a.ok(text.includes("plan"),"names the record id");
 a.ok(text.includes("brief_en"),"names the missing field");
});
test("walker covers missions/tasks/options/primers/glossary/sources and tlc modules",()=>{
 const data=structuredClone(questData);
 delete data.missions[5].tasks[2].steps[4].text_en;          // order-task step text
 delete data.missions[0].tasks[0].options[4].label_en;       // option label (promise)
 data.missions[0].tasks[1].groups[2].pop();                  // classify tuple 3rd element
 delete data.primers.redgreen.concept_en;                    // primer concept
 data.glossary[1]=data.glossary[1].slice(0,2);               // glossary term_en AND text_en
 data.glossary[14].pop();                                    // glossary text_en only
 delete data.sources[0].topic_en;                            // source topic
 const report=parityReport(data);
 a.equal(report.length,8,`expected 8 planted findings, got ${report.map(fmt).join("; ")}`);
 const text=report.map(fmt).join("\n");
 a.ok(text.includes("#promise")&&text.includes("label_en"));
 a.ok(text.includes("#redgreen")&&text.includes("concept_en"));
 a.ok(text.includes("#Intenção")&&text.includes("term_en")&&text.includes("text_en"));
 a.ok(text.includes("sources[0]")&&text.includes("topic_en"));
 a.ok(text.includes("groups[2]")&&text.includes("label_en"));
 const tlc=structuredClone(tlcData);
 delete tlc.modules[3].tasks[0].options[1].why_en;           // why_en where PT why is non-empty
 delete tlc.modules[1].name_en;                              // module name
 tlc.modules[0].tasks[1].groups[0].pop();                    // classify tuple
 delete tlc.notice_en;
 const tlcReport=parityReport(tlc);
 a.equal(tlcReport.length,4,`expected 4 planted tlc findings, got ${tlcReport.map(fmt).join("; ")}`);
 const tlcText=tlcReport.map(fmt).join("\n");
 a.ok(tlcText.includes("#F2")&&tlcText.includes("why_en"));
 a.ok(tlcText.includes("modules[1]")&&tlcText.includes("name_en"));
 a.ok(tlcText.includes("groups[0]")&&tlcText.includes("label_en"));
 a.ok(tlcText.includes("notice_en"));
});
test("walker green on real data",()=>{
  a.deepEqual(parityReport(questData),[]);
  a.deepEqual(parityReport(tlcData),[]);
});

// C8 (rework): chrome-table key-parity walker. The record walker above guards data.js and
// tlc-data.js records; this one guards the STRINGS/CHROME pt/en tables of the UI modules and
// tools plus the harness STEPS *_en fields, so future chrome drift fails the gate instead of
// silently falling back to pt-BR. Browser-only modules (app/tlc-app/harness-app/world) cannot
// be required under node, so their tables are extracted from source with a brace-balanced
// slice and evaluated — the same read-the-source approach as docs-bilingual.test.cjs.
const fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const CHROME_TABLES=[
  ["src/app.js","STRINGS"],["src/app.js","CHROME"],
  ["src/tlc-app.js","STRINGS"],
  ["src/harness-app.js","STRINGS"],
  ["src/core.js","STRINGS"],
  ["src/harness-core.js","STRINGS"],
  ["src/world.js","CAPTIONS"],
  ["tools/serve.cjs","STRINGS"],["tools/test.cjs","STRINGS"],
  ["tools/check-package.cjs","STRINGS"],["tools/quest-gate.cjs","STRINGS"]
];
function extractTable(file,name){
  const src=fs.readFileSync(path.join(ROOT,file),"utf8");
  const re=new RegExp("(?:const |let |var )?"+name+"\\s*=\\s*\\{");
  const head=re.exec(src);
  if(!head)throw new Error("table not found: "+file+" "+name);
  let depth=0,quote=null,esc=false;
  for(let i=head.index+head[0].length-1;i<src.length;i++){
    const ch=src[i];
    if(quote){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch===quote)quote=null;continue;}
    if(ch==='"'||ch==="'"||ch==="`"){quote=ch;continue;}
    if(ch==="{")depth++;
    else if(ch==="}"){depth--;if(depth===0)return src.slice(head.index+head[0].length-1,i+1);}
  }
  throw new Error("unbalanced table: "+file+" "+name);
}
function evalTable(file,name){return (new Function("return ("+extractTable(file,name)+")"))();}
function keyParity(table,where,out){
  const pt=table&&table.pt,en=table&&table.en;
  if(!pt||typeof pt!=="object"||!en||typeof en!=="object"){out.push({where,field:"pt/en tables"});return;}
  const ptKeys=Object.keys(pt),enKeys=Object.keys(en);
  for(const key of ptKeys)if(!enKeys.includes(key))out.push({where,field:`en.${key}`});
  for(const key of enKeys)if(!ptKeys.includes(key))out.push({where,field:`pt.${key}`});
  for(const key of ptKeys){
    if(!enKeys.includes(key))continue;
    const pv=pt[key],ev=en[key];
    if(typeof pv==="string"&&typeof ev==="string"&&!ev.length)out.push({where,field:`en.${key} empty`});
    if(pv!==null&&typeof pv==="object"&&typeof ev==="object")keyParity({pt:pv,en:ev},`${where}.${key}`,out);
    else if(typeof pv!==typeof ev)out.push({where,field:`type mismatch ${key}`});
  }
}
test("chrome tables keep full pt/en key parity on real sources",()=>{
  for(const [file,name] of CHROME_TABLES){
    const out=[];
    keyParity(evalTable(file,name),`${file}:${name}`,out);
    a.deepEqual(out,[],`${file}:${name} drift: ${out.map(f=>f.where+" "+f.field).join("; ")}`);
  }
});
test("chrome parity walker detects planted drift",()=>{
  const drifted=evalTable("src/core.js","STRINGS");
  delete drifted.en.backupTooLarge;
  let out=[];keyParity(drifted,"probe",out);
  a.equal(out.length,1);
  a.ok(out[0].field.includes("backupTooLarge"));
  const nested=evalTable("src/core.js","STRINGS");
  delete nested.en.patchCases.aFindsA;
  out=[];keyParity(nested,"probe",out);
  a.equal(out.length,1);
  a.ok(out[0].where.includes("patchCases"),"report names the sub-table");
  a.ok(out[0].field.includes("aFindsA"),"report names the missing key");
});
test("harness STEPS carry title/subtitle/artifact _en fields",()=>{
  const harness=require("../src/harness-core.js");
  a.ok(Array.isArray(harness.STEPS)&&harness.STEPS.length>=6,"STEPS exported and populated");
  for(const step of harness.STEPS){
    for(const field of ["title_en","subtitle_en","artifact_en"]){
      a.equal(typeof step[field],"string",`${step.id}.${field} must be a string`);
      a.ok(step[field].length>0,`${step.id}.${field} must be non-empty`);
    }
  }
  const probe=structuredClone(harness.STEPS);
  delete probe[3].title_en;
  const missing=probe.filter(s=>!(typeof s.title_en==="string"&&s.title_en.length)).map(s=>s.id);
  a.deepEqual(missing,["verify"]);
});
test("runtime glossary pushes carry the EN pair",()=>{
  const src=fs.readFileSync(path.join(ROOT,"src/harness-app.js"),"utf8");
  const marker="QuestData.glossary.push(";
  const start=src.indexOf(marker);
  a.ok(start>=0,"harness-app pushes glossary entries");
  const end=src.indexOf(");",start);
  a.ok(end>start);
  const tuples=(new Function("return (["+src.slice(start+marker.length,end)+"])"))();
  a.ok(tuples.length>=4,"expected the four Harness Lab terms");
  for(const tuple of tuples){
    a.equal(tuple.length,4,`tuple "${tuple[0]}" must be [term,def,term_en,def_en]`);
    for(const cell of tuple)a.equal(typeof cell,"string","cells must be strings");
    a.ok(tuple[2].length>0&&tuple[3].length>0,`tuple "${tuple[0]}" EN pair must be non-empty`);
  }
});
