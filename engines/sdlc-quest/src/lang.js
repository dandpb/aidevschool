/* Language helper: pt-BR by default, optional English. Self-contained, zero dependencies.
 * Preference lives in localStorage['sdlc-quest:lang'] ('pt'|'en'); absence means pt.
 * Resolution always falls back to the pt-BR text, never to a raw key or an empty string. */
(function(root){
'use strict';
const KEY='sdlc-quest:lang';
const DOC_LANG={pt:'pt-BR',en:'en'};
const storage=(()=>{try{const s=root.localStorage;return s&&typeof s.getItem==='function'?s:null;}catch{return null;}})();
let active='pt';
if(storage){try{if(storage.getItem(KEY)==='en')active='en';}catch{/* storage unavailable: keep pt default */}}
function syncDocument(){
 const doc=root.document;
 if(doc&&doc.documentElement)doc.documentElement.lang=DOC_LANG[active];
}
syncDocument();
function get(){return active;}
function normalize(lang){return lang==='en'||lang==='pt'?lang:active;}
function set(lang){
 if(lang!=='pt'&&lang!=='en')return active;
 active=lang;
 try{if(storage)storage.setItem(KEY,lang);}catch{/* preference stays session-only when storage fails */}
 syncDocument();
 const doc=root.document;
 if(doc&&typeof doc.dispatchEvent==='function')doc.dispatchEvent(new Event('quest-lang-changed'));
 return active;
}
function toggle(){return set(active==='pt'?'en':'pt');}
/* Chrome tables: t(STRINGS,key) with STRINGS={pt:{...},en:{...}}. */
function t(table,key,lang){
 const en=normalize(lang)==='en'?table&&table.en&&table.en[key]:undefined;
 if(typeof en==='string')return en;
 const pt=table&&table.pt&&table.pt[key];
 return typeof pt==='string'?pt:'';
}
/* Data records: field(record,'brief') reads brief_en in English and falls back to brief. */
function field(record,name,lang){
 if(normalize(lang)==='en'){
  const en=record&&record[name+'_en'];
  if(typeof en==='string'&&en.length)return en;
 }
 const value=record&&record[name];
 return typeof value==='string'?value:'';
}
const api={KEY,get,set,toggle,t,field};
if(typeof module==='object'&&module.exports)module.exports=api;else root.QuestLang=api;
})(typeof globalThis!=='undefined'?globalThis:this);
