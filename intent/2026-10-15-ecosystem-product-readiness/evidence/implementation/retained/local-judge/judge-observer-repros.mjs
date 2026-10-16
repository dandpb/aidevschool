import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';

const base='intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/';
const source = await fs.readFile(base+'learning-runtime-support.mjs','utf8');
const text = source.slice(source.indexOf('export async function startVite('),source.indexOf('export async function readProgress(')).replace('export ','');
const child=new EventEmitter(); Object.assign(child,{pid:1234,exitCode:null,signalCode:null});
let logClosed=false; const kills=[];
const sandbox={path,root:'/synthetic',createRequire:()=>({resolve:()=>'/synthetic/node_modules/vite/package.json'}),fs:{open:async()=>({fd:99,close:async()=>{logClosed=true}}),writeFile:async()=>{}},spawn:()=>child,process:{execPath:'/node',env:{},kill:(...args)=>kills.push(args)},fetch:async()=>{throw new Error('synthetic connection refused')},setTimeout:(fn)=>{fn()},port:async()=>12345};
vm.createContext(sandbox);vm.runInContext(text,sandbox);
let startupError;
try { await sandbox.startVite('literacyDojo','/synthetic/logs') } catch(error) { startupError=String(error) }
assert.match(startupError,/did not become ready/);
assert.equal(kills.length,0); assert.equal(logClosed,false);
console.log(JSON.stringify({probe:'startVite readiness failure',startupError,stopSignals:kills.length,logClosed,childStillRunning:child.exitCode===null&&child.signalCode===null,method:'Unchanged function source; fake child/fs/fetch and immediate timers; no process or server launched'}));

const products=await fs.readFile(base+'local-products-runtime.mjs','utf8');
const commandText=products.slice(products.indexOf('export async function command('),products.indexOf('export async function serve(')).replace('export ','');
let exitedBeforeWriteReturned=false;
const fake=new EventEmitter(); fake.stdout=new EventEmitter();fake.stderr=new EventEmitter();Object.assign(fake,{pid:1235,exitCode:null,signalCode:null});
const records={commands:[],logDir:'/synthetic/logs'};
const sandbox2={path,assert,safeEnv:(x)=>x,spawn:()=>fake,process:{pid:7,kill:()=>{}},pause:(ms)=>new Promise(r=>setTimeout(r,ms)),writeFile:async()=>{fake.exitCode=0;exitedBeforeWriteReturned=true;fake.emit('exit',0,null)}};
vm.createContext(sandbox2);vm.runInContext(commandText,sandbox2);
const handle=await sandbox2.command(records,'/synthetic',['node','-e',''],{},false);
const settled=await Promise.race([handle.done.then(()=>true),new Promise(r=>setTimeout(()=>r(false),25))]);
assert.equal(exitedBeforeWriteReturned,true);assert.equal(fake.exitCode,0);assert.equal(settled,false);assert.equal(records.commands[0].exitCode,null);
console.log(JSON.stringify({probe:'command short-child exit before ownership-write completes',childExitCode:fake.exitCode,recordExitCode:records.commands[0].exitCode,doneResolved:settled,method:'Unchanged function source; fake child emits real EventEmitter exit during ownership write; no process or server launched'}));
