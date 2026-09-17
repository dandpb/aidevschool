/* TLC lesson interface. Nothing here invokes an agent, a package manager or GitHub. */
(function(){
'use strict';
const D=QuestTLCData,C=QuestTLC,B=QuestBridge,$=s=>document.querySelector(s);
const dialog=$('#tlc-dialog'),content=$('#tlc-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=B.read(),moduleIndex=0,taskIndex=0,answer=null,opener=null,view='hub',lastLab=null;
function save(){B.write(state);state=B.read();}
function notify(text){B.toast(text);}
function modalSync(){document.dispatchEvent(new Event('quest-modal'));}
function frame(title,kicker,body){
 content.innerHTML=`<div class="dialog-top"><button class="tlc-back" data-tlc="hub" aria-label="Voltar à oficina TLC">← Oficina</button><span class="eyebrow">${esc(kicker)}</span><button class="close-btn" data-tlc="close" aria-label="Fechar oficina TLC">×</button></div><div class="tlc-main"><h2 id="tlc-title" tabindex="-1">${esc(title)}</h2>${body}</div>`;
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;modalSync();$('#tlc-title').focus({preventScroll:true});
}
function open(where='hub'){
 state=B.read();opener=document.activeElement;
 for(const other of document.querySelectorAll('dialog[open]'))if(other!==dialog)other.close();
 if(where==='kit')showKit();else {const i=D.modules.findIndex(m=>m.id===where);if(i>=0)showModule(i);else showHub();}
}
function banner(){
 state=B.read();const st=C.stats(state),el=$('#tlc-banner');
 el.innerHTML=`<div><span class="tlc-label">EXPANSÃO · TECH LEADS CLUB</span><strong>Seu time de quatro especialistas.</strong><span class="tlc-banner-note">Discover → Plan → Implement → Judge</span></div><div class="tlc-banner-actions"><span class="tlc-count" aria-label="${st.done} de ${st.total} desafios TLC concluídos">${st.done}/${st.total} <span>desafios TLC</span></span><button class="primary" id="tlc-launch" data-open-tlc="hub">Entrar na oficina <span aria-hidden="true">↗</span></button></div>`;
}
function showHub(){
 view='hub';state=B.read();const st=C.stats(state);
 frame('Quatro especialistas. Uma entrega verificável.','TLC AI DEV FLOW',`
 <p class="tlc-lead">A mesma feature de retry, agora com papéis, entradas e saídas explícitas. Estude em qualquer ordem; os desafios de cada especialista formam uma sequência.</p>
 <div class="tlc-hub-meter"><span><strong>${st.done}/${st.total}</strong> desafios</span><span><strong>${st.xp}</strong> XP TLC</span><span><strong>${st.modules}/4</strong> especialistas</span><button class="text-button" data-tlc="kit">Instalação, prompts e fontes ↗</button></div>
 <div class="tlc-agents">${D.modules.map((m,i)=>{const done=m.tasks.filter(t=>state.done[t.id]).length;return `<button class="tlc-agent" data-tlc-module="${i}" aria-label="${m.skill}, ${done} de 4 desafios concluídos"><span class="tlc-agent-top"><span class="tlc-agent-glyph" aria-hidden="true">${m.glyph}</span><span class="tlc-agent-role">0${i+1} / ${esc(m.role)}</span></span><code>${m.skill}</code><h3>${esc(m.name)}</h3><p>${esc(m.brief)}</p><span class="tlc-agent-end">${done===4?'Revisitar ✓':done?'Continuar →':'Começar →'}<span>${done}/4</span></span></button>`;}).join('')}</div>
 <div class="tlc-split-note"><p><strong>18 + 16, sem perder o que você já fez.</strong> A campanha original continua com seu XP e seus desbloqueios. A expansão tem progressão própria e entra no mesmo backup. Ao trocar o arquivo, importe o JSON da v1.1 em Configurações → Restaurar backup.</p><p><strong>As skills não substituem a infraestrutura.</strong> Deploy, monitoramento e autorização continuam nas estações originais. Este jogo ensina o uso das skills; não executa agentes reais.</p></div>
 <button class="harness-link" data-open-harness="true"><strong>Coloque este fluxo à prova →</strong><br>Abra o laboratório de execução: pré-condições, testes reais em memória e evidências invalidadas após alterações.</button><div class="tlc-footer-actions"><button class="secondary" data-tlc="guide">Exportar meu guia TLC ↓</button><button class="secondary" data-tlc="backup">Backup completo do jogo ↓</button></div>`);
}
function showModule(index){
 moduleIndex=Math.max(0,Math.min(3,index));state.selected=moduleIndex;save();
 const m=D.modules[moduleIndex],next=m.tasks.findIndex(t=>!state.done[t.id]);
 if(next<0)showReward();else showTask(next);
}
function showTask(index){
 const m=D.modules[moduleIndex],t=m.tasks[index];if(!t||!C.canOpen(state,t.id))return;
 view='task';taskIndex=index;lastLab=null;answer=structuredClone(state.drafts[t.id]??C.cleanAnswer(t,null));
 const done=m.tasks.filter(t=>state.done[t.id]).length;
 frame(t.title,m.skill,`
 <div class="tlc-lesson-meta"><span>${esc(m.stage)}</span><span>Desafio ${index+1} de 4 · ${state.done[t.id]?'Revisão sem XP extra':`até ${C.score(state.attempts[t.id])} XP TLC`}</span></div>
 <nav class="tlc-task-nav" aria-label="Desafios de ${m.skill}">${m.tasks.map((x,i)=>`<button data-tlc-task="${i}" ${C.canOpen(state,x.id)?'':'disabled'} ${i===index?'aria-current="step"':''} aria-label="Desafio ${i+1}: ${esc(x.title)}${state.done[x.id]?', concluído':''}">${state.done[x.id]?'✓':i+1}</button>`).join('')}<span>${done}/4 concluídos</span></nav>
 <p class="tlc-lead">${esc(t.lead)}</p>
 <details class="tlc-concept"><summary>Entender o conceito <span>Grátis · sem desconto de XP</span></summary><p>${esc(t.concept)}</p><div class="tlc-example"><strong>Exemplo</strong><p>${esc(t.example)}</p></div><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Ler a skill original ↗</a></details>
 ${exercise(t)}
 <div id="tlc-lab-output"></div>
 <div id="tlc-feedback" class="feedback hidden" role="status" aria-live="polite" tabindex="-1"></div>
 <div class="tlc-task-actions"><button class="text-button" data-tlc="module-kit">Ver entrada, saída e prompt ↗</button><div><button class="primary" id="tlc-submit" data-tlc="submit">${t.type==='prooflab'?'Executar provas':t.type==='reviewlab'?'Preparar review simulada':'Verificar decisão'}</button><button class="primary hidden" id="tlc-next" data-tlc="next">${index===3?'Receber artefato →':'Próximo desafio →'}</button></div></div>
 <p class="tlc-disclaimer">Cenário didático. Nenhum comando, agente, serviço externo ou ação de produção é executado.</p>`);
 paintOptions(t);
}
function optionsHTML(t){
 const selected=id=>t.type==='choice'?answer===id:t.type==='reviewlab'?answer.findings.includes(id):answer.includes(id);
 return `<div class="options-list tlc-options" role="group" aria-label="Escolhas do desafio">${QuestCore.shuffled(t.options,t.id).map(o=>`<button class="option" data-tlc-option="${o.id}" aria-pressed="${selected(o.id)}"><span class="check" aria-hidden="true">✓</span><div><strong>${esc(o.label)}</strong></div></button>`).join('')}</div>`;
}
function exercise(t){
 if(t.type==='choice'||t.type==='select')return `<p class="instruction">${t.type==='select'?`Selecione ${t.answer.length} cartões.`:'Escolha uma decisão.'}</p>${optionsHTML(t)}`;
 if(t.type==='classify')return `<p class="instruction">Associe cada situação ao seu destino.</p><div class="classify-list tlc-classify">${t.items.map(i=>`<div class="classify-row"><label for="tlc-field-${i.id}">${esc(i.text)}</label><select id="tlc-field-${i.id}" data-tlc-field="${i.id}"><option value="">Escolha…</option>${t.groups.map(([v,l])=>`<option value="${v}" ${answer[i.id]===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`).join('')}</div>`;
 if(t.type==='prooflab')return `<div class="tlc-lab-intro"><span class="tlc-label">LABORATÓRIO EXECUTÁVEL · DADOS FICTÍCIOS</span><p>Objetivo: antes do patch <b>falha</b> → candidata <b>passa</b> → mutante que nega tudo <b>falha</b>.</p></div><div class="tlc-lab-config">
 <label for="tlc-suite">1. Escolha o que testar<select id="tlc-suite" data-tlc-field="suite"><option value="">Selecione a suíte…</option>${[['happy','Só acessos permitidos'],['placebo','Só quantidade de fixtures'],['contract','Contrato: acessos permitidos, cruzados e ID ausente']].map(([v,l])=>`<option value="${v}" ${answer.suite===v?'selected':''}>${l}</option>`).join('')}</select></label>
 <label for="tlc-patch">2. Escolha a candidata<select id="tlc-patch" data-tlc-field="patch"><option value="">Selecione a implementação…</option>${[['original','Manter: busca somente pelo ID'],['denyAll','Negar tudo: retornar null'],['scoped','Corrigir: filtrar ID e tenant']].map(([v,l])=>`<option value="${v}" ${answer.patch===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <pre class="tlc-code" id="tlc-code-sample" tabindex="0" aria-label="Código da implementação escolhida">${esc(patchCode(answer.patch))}</pre><p class="tlc-caption">As funções são predefinidas e usam fixtures locais. Não há eval nem execução de código digitado. O teste pré-patch aplica-se aqui a um bug conhecido, não a todo teste novo.</p>`;
 if(t.type==='reviewlab')return `<pre class="tlc-code" tabindex="0" aria-label="Trecho fictício revisado">${esc('src/retry.ts — diff fictício\n1  async function retry(req, repo, logger) {\n2    const item = await repo.find(req.params.id, req.user.tenant);\n3    if (!item) return { status: 404 };\n4 +  logger.info({ authorization: req.headers.authorization });\n5    return { status: 202, body: { deliveryId: item.id } };\n6  }')}</pre><p class="instruction">Selecione os achados para a revisão inline consolidada e escolha o veredito.</p>${optionsHTML(t)}<label class="tlc-verdict-field" for="tlc-verdict">Veredito da review<select id="tlc-verdict" data-tlc-field="verdict"><option value="">Escolha…</option>${['APPROVE','COMMENT','REQUEST_CHANGES'].map(v=>`<option ${answer.verdict===v?'selected':''}>${v}</option>`).join('')}</select></label><p class="tlc-caption">Adaptador didático: este tribunal não executa o review_gate.py oficial, não publica review e não autoriza merge.</p>`;
 return '';
}
function patchCode(patch){return patch==='scoped'?'return rows.find(row =>\n  row.id === id && row.tenant === tenant\n) ?? null;':patch==='denyAll'?'return null; // defeito: também nega os acessos permitidos':patch==='original'?'return rows.find(row => row.id === id) ?? null;':'Escolha uma candidata para inspecionar a função.';}
function paintOptions(t){for(const button of content.querySelectorAll('[data-tlc-option]')){const id=button.dataset.tlcOption;button.setAttribute('aria-pressed',String(t.type==='choice'?answer===id:t.type==='reviewlab'?answer.findings.includes(id):answer.includes(id)));}}
function clearResult(){lastLab=null;$('#tlc-lab-output').innerHTML='';$('#tlc-feedback').className='feedback hidden';$('#tlc-next').classList.add('hidden');$('#tlc-submit').classList.remove('hidden');}
function remember(){const t=D.modules[moduleIndex].tasks[taskIndex];state.drafts[t.id]=C.cleanAnswer(t,answer);save();}
function renderLab(result){
 if(!result.versions?.length)return;
 $('#tlc-lab-output').innerHTML=`<div class="tlc-proof-grid">${result.versions.map(v=>`<section class="tlc-proof ${v.exitCode?'proof-red':'proof-green'}"><h3>${esc(v.label)}</h3><strong>${v.exitCode?'FALHOU':'PASSOU'} <small>status local ${v.exitCode}</small></strong><ul>${v.checks.map(x=>`<li><span aria-hidden="true">${x.pass?'✓':'×'}</span><div>${esc(x.label)}<small>Esperado: ${esc(x.expected===null?'null':x.expected)} · obtido: ${esc(x.actual===null?'null':x.actual)}</small></div></li>`).join('')}</ul></section>`).join('')}</div><p class="tlc-caption">${result.versions.reduce((n,v)=>n+v.checks.length,0)} asserções locais executadas nesta rodada. Status 0/1 é calculado no navegador; não é um processo de CI.</p>`;
}
function submit(){
 const t=D.modules[moduleIndex].tasks[taskIndex];
 if(t.type==='prooflab'&&C.hasAnswer(t,answer)){lastLab=C.runLab(answer.suite,answer.patch);renderLab(lastLab);}
 const result=C.submit(state,t.id,answer);save();const feedback=$('#tlc-feedback');
 feedback.className='feedback'+(result.ok?' good':'');feedback.innerHTML=`<strong>${result.ok?'Decisão verificada.':result.empty?'Falta uma escolha.':'Ainda não. Vamos ajustar.'}</strong>${esc(result.message)}${t.type==='prooflab'&&result.ok?'<p><button class="secondary" data-tlc="lab-proof">Baixar execução local ↓</button></p>':''}${t.type==='reviewlab'&&result.ok?'<p><button class="secondary" data-tlc="findings">Exportar findings didático ↓</button></p>':''}`;
 if(result.ok){$('#tlc-next').classList.remove('hidden');$('#tlc-submit').classList.add('hidden');}
 feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'nearest',behavior:'instant'});
}
function artifactText(m){
 const common=`# ${m.artifact}\n\nADAPTAÇÃO DIDÁTICA — exemplo fictício, não resultado de agente real.\nFonte: ${m.source}\nConsulta: ${D.checkedAt}\n\n`;
 if(m.id==='discover')return common+'## Situation\nRetry para administradores aprovado no cenário.\n\n## Problem\nO suporte depende de reenvio manual de entregas falhas.\n\n## Verdict\nConstruir a menor capacidade que reduza a intervenção manual.\n\n## What counts as worked\nMeta fictícia acordada: reduzir 40 para menos de 15 min/dia em duas semanas; Ana revisa. Não é um critério de teste unitário.\n\n## Boundary\nSem reenvio em massa ou novos destinos.\n\n## Shape\nAdds: solicitação de retry e consulta de tentativa.\nChanges: autorização do novo caminho e mensagens de resultado.\nLeaves: restante do serviço e contratos não relacionados.\n\n## Decisions\nSomente admin do próprio tenant. Nenhuma promessa de exactly-once arbitrário.\n\n## Roadmap\nEsclarecer tratamento de duplicatas; então passar a tlc-plan.\n';
 if(m.id==='plan')return common+'## Intent\nTornar o retry elegível observável do pedido à consulta da tentativa.\n\n## Criteria\nC1: ID vazio retorna 400.\nC2: entrega ausente retorna 404.\nC3: acesso exige admin e o tenant correto.\nC4: estados queued → processing → succeeded ou failed.\n\n## Out of scope\nReenvio em massa.\n\n## Observable\nAPI: critérios C1–C3. Tela: definir estados de loading, vazio e erro antes de implementar a interface.\n\n## Swept\nvalidation: C1\nfailure modes: C2\nidempotency and retry: existing — deduplicação inspecionada no cenário\nauthorization: C3\nconcurrency and ordering: Unresolved 1\ndata lifecycle: Unresolved 2\nexternal-dependency failure: existing — timeout do adaptador vira failed\nstate transitions: C4\nobservability: existing — eventos de auditoria e redação inspecionados no cenário\n\n## Unresolved\n1 | blocks build | decidir resposta concorrente e mecanismo de exclusão\n2 | open | confirmar retenção das tentativas com o responsável\n\nNão implementar uma garantia ainda não decidida. Esta ficha é resumida e não substitui o template oficial.\n';
 if(m.id==='implement')return common+'## Sources\n.tasks/retry-webhook.md — critérios aprovados\n\n## Out of scope\nDeploy, push e qualquer mudança de produção sem autorização.\n\n## Landing\nConsulta local com filtro de ID e tenant; não equivale a autenticação de uma API.\n\n## Checks\nC1: acesso permitido A → A tem prova own-a.\nC2: acesso permitido B → B tem prova own-b.\nC3: acesso A → B negado tem prova cross-a.\nC4: acesso B → A negado tem prova cross-b.\nC5: ID ausente retorna null tem prova missing.\n\n## Coverage\nCinco casos explícitos. Regressão: contrato detecta o código anterior e o mutante que nega tudo.\nLacunas: HTTP, autenticação, concorrência e infraestrutura não são exercitados neste laboratório.\n\n## Handoff\nNo projeto real: fatias fechadas, commit, checklist, diff, esclarecimentos e tentativas abandonadas.\n\n## Verification\nEsta ficha descreve os checks do laboratório, mas não atesta que o jogador os executou. Use o botão de exportar execução na tela do laboratório para registrar resultados. Nenhum subagente independente é executado pelo jogo.\n';
 return JSON.stringify(C.reviewArtifact(),null,2)+'\n';
}
function showReward(){
 view='reward';const m=D.modules[moduleIndex],xp=m.tasks.reduce((n,t)=>n+(state.done[t.id]?.score||0),0);
 frame('Especialista concluído.',m.skill,`<div class="tlc-reward"><span class="tlc-agent-glyph" aria-hidden="true">${m.glyph}</span><h3>${esc(m.name)}</h3><p>4 desafios · ${xp} XP TLC. O importante não é o título: é saber o que entra, o que sai e o que ainda precisa ser provado.</p><code>${esc(m.artifact)}</code><div class="tlc-footer-actions"><button class="primary" data-tlc="artifact">Baixar exemplo didático ↓</button><button class="secondary" data-tlc="module-kit">Usar no meu projeto ↗</button></div></div><div class="tlc-footer-actions"><button class="secondary" data-tlc-task="0">Revisitar desafios</button><button class="primary" ${moduleIndex<3?`data-tlc-module="${moduleIndex+1}"`:'data-tlc="hub"'}>${moduleIndex<3?'Próximo especialista →':'Voltar à oficina →'}</button></div><p class="tlc-disclaimer">Esta conquista é local e didática, não uma certificação ou auditoria independente.</p>`);
}
function showKit(onlyModule=false){
 view='kit';const modules=onlyModule?[D.modules[moduleIndex]]:D.modules;
 frame('Leve o fluxo para seu projeto.','INSTALAÇÃO + HANDOFF',`
 <p class="tlc-lead">A oficina ensina as decisões. A instalação das skills acontece no terminal do seu projeto, fora deste HTML.</p><div class="tlc-install"><span class="tlc-label">COMANDO PUBLICADO PELO TECH LEADS CLUB</span><pre class="tlc-code" id="tlc-install-command" tabindex="0">${esc(D.install)}</pre><button class="secondary" data-tlc="copy-install">Copiar comando</button><p>O comando requer Node.js/npm e acesso à rede. Revise a origem e as opções apresentadas pelo instalador. Copiar não executa nem instala nada.</p></div>
 <div class="tlc-prompt-list">${modules.map(m=>`<section class="tlc-prompt-card"><h3><span aria-hidden="true">${m.glyph}</span> <code>${m.skill}</code></h3><dl><div><dt>Quando entra</dt><dd>${esc(m.input)}</dd></div><div><dt>O que entrega</dt><dd>${esc(m.output)}</dd></div><div><dt>No SDLC Quest</dt><dd>${esc(m.stage)}</dd></div></dl><pre class="tlc-code" tabindex="0">${esc(m.prompt)}</pre><div class="tlc-footer-actions"><button class="secondary" data-tlc-copy="${m.id}">Copiar prompt</button><button class="text-button" data-tlc-module="${D.modules.indexOf(m)}">Praticar →</button><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Skill original ↗</a></div></section>`).join('')}</div>
 <section class="tlc-source-notes"><h3>Fidelidade, limites e fontes</h3><p><strong>Artefatos:</strong> .design, .tasks e .checks são os caminhos documentados. Os exemplos baixados aqui são fichas resumidas da campanha, não cópias completas dos templates oficiais.</p><p><strong>Verificação:</strong> a skill tlc-implement exige um verificador novo. Sem esse recurso, o resultado permanece sem verificação independente — não basta renomear o autor.</p><p><strong>Review:</strong> the-judge produz APPROVE, COMMENT ou REQUEST_CHANGES, não uma nota de 0 a 10. Tem limite de três rodadas para o mesmo conjunto de achados. Uma review não é autorização de deploy.</p><p><strong>Escopo:</strong> as quatro skills são o núcleo do fluxo consultado. Entrada, triagem e produção aparecem como futuras estações nessa página; as seis etapas completas continuam sendo ensinadas pela campanha original.</p><p>${esc(D.notice)}</p><p><a href="${esc(D.flow)}" target="_blank" rel="noopener noreferrer">TLC AI Dev Flow ↗</a> · <a href="${esc(D.license)}" target="_blank" rel="noopener noreferrer">CC BY 4.0 ↗</a></p></section><div class="tlc-footer-actions"><button class="primary" data-tlc="guide">Exportar guia com prompts ↓</button><button class="secondary" data-tlc="backup">Backup completo ↓</button></div>`);
}
async function copy(text){
 try{if(!navigator.clipboard?.writeText)throw new Error('unavailable');await navigator.clipboard.writeText(text);notify('Texto copiado. Nenhum comando foi executado.');}
 catch{let box=$('#tlc-copy-fallback');if(!box){box=document.createElement('div');box.id='tlc-copy-fallback';box.className='tlc-copy-fallback';box.innerHTML='<label for="tlc-copy-text">Cópia automática indisponível. Copie o texto selecionado com Ctrl+C / ⌘C.</label><textarea id="tlc-copy-text" readonly rows="5"></textarea>';content.querySelector('.tlc-main').prepend(box);}const field=$('#tlc-copy-text');field.value=text;field.focus();field.select();box.scrollIntoView({block:'nearest',behavior:'instant'});}
}
function guide(){
 state=B.read();const st=C.stats(state);
 return `# SDLC Quest v1.2 — Oficina TLC\n\nConsulta das fontes: ${D.checkedAt}\nProgresso didático: ${st.done}/${st.total} desafios; ${st.xp} XP TLC.\nNão é evidência de execução de skills ou de uma feature real.\n\n## Instalação fora do jogo\n\`\`\`sh\n${D.install}\n\`\`\`\n\n`+D.modules.map(m=>`## ${m.skill}\n\nEntrada: ${m.input}\nSaída: ${m.output}\nIntegração: ${m.stage}\nFonte: ${m.source}\n\n### Prompt sugerido\n${m.prompt}\n\n### Desafios e princípios (checkbox = concluído no jogo)\n`+m.tasks.map(t=>`- ${state.done[t.id]?'[x]':'[ ]'} ${t.title} — ${t.success}`).join('\n')+`\n\n### Exemplo de artefato (didático, não template oficial completo)\n\`\`\`text\n${artifactText(m)}\`\`\`\n`).join('\n')+`\n## Limites\nNão executa npx, agentes, gh ou produção. Laboratório cobre consulta local; não cobre autenticação HTTP nem concorrência real. Verificação independente não foi executada pelo jogo. Pontuação não prova domínio.\n\n## Atribuição\n${D.notice}\n${D.license}\n${D.flow}\n`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-open-tlc]');if(b)open(b.dataset.openTlc);});
content.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.tlcModule!==undefined){showModule(Number(b.dataset.tlcModule));return;}
 if(b.dataset.tlcTask!==undefined){showTask(Number(b.dataset.tlcTask));return;}
 if(b.dataset.tlcCopy){copy(D.modules.find(m=>m.id===b.dataset.tlcCopy).prompt);return;}
 if(b.dataset.tlcOption){const t=D.modules[moduleIndex].tasks[taskIndex],id=b.dataset.tlcOption;if(t.type==='choice')answer=id;else {const arr=t.type==='reviewlab'?answer.findings:answer;const at=arr.indexOf(id);if(at<0)arr.push(id);else arr.splice(at,1);}paintOptions(t);clearResult();remember();return;}
 switch(b.dataset.tlc){
  case 'close':dialog.close();break;
  case 'hub':showHub();break;
  case 'kit':showKit();break;
  case 'module-kit':showKit(true);break;
  case 'submit':submit();break;
  case 'next':taskIndex===3?showReward():showTask(taskIndex+1);break;
  case 'copy-install':copy(D.install);break;
  case 'guide':B.download('SDLC-Quest-TLC-meu-guia.md',guide(),'text/markdown');break;
  case 'backup':B.backup();break;
  case 'artifact':{const m=D.modules[moduleIndex];B.download('TLC-'+m.id+'-'+m.artifact.split('/').pop(),artifactText(m),'text/plain');break;}
  case 'lab-proof':if(lastLab)B.download('TLC-execucao-local.json',JSON.stringify({simulation:true,scope:'Funções de consulta em memória; não é CI, HTTP, autenticação ou um verificador independente.',appVersion:D.version,exportedAt:new Date().toISOString(),...lastLab},null,2),'application/json');break;
  case 'findings':B.download('TLC-findings-didatico.json',JSON.stringify(C.reviewArtifact(),null,2),'application/json');break;
 }
});
content.addEventListener('change',e=>{if(!e.target.dataset.tlcField)return;answer[e.target.dataset.tlcField]=e.target.value;clearResult();remember();if(e.target.id==='tlc-patch')$('#tlc-code-sample').textContent=patchCode(answer.patch);});
dialog.addEventListener('close',()=>{modalSync();if(opener?.isConnected)opener.focus({preventScroll:true});else $('#tlc-launch')?.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
QuestData.glossary.push(
 ['TLC AI Dev Flow','Núcleo de quatro skills: tlc-discover, tlc-plan, tlc-implement e the-judge. A oficina adicional pratica seu uso; não as executa. Fontes e instalação estão no painel Skills TLC.'],
 ['tlc-discover','Investiga o problema e decisões abertas; produz veredito e design quando aplicável. Compromissos já tomados não precisam de um novo gate encenado.'],
 ['tlc-plan','Converte decisões em tarefas com resultados observáveis, faz o surface walk e a varredura de nove dimensões. Uma lacuna vira pergunta, não requisito inventado.'],
 ['tlc-implement','Extrai checks com provas, implementa e exige verificação por um executor novo. Os perfis light, standard e ui explicitam a profundidade e as limitações.'],
 ['the-judge','Revisor de PR com evidências e vereditos APPROVE, COMMENT ou REQUEST_CHANGES. Não dá nota de perfeição, não implementa a correção e não autoriza deploy.'],
 ['Carryover e convergência','Pendências de rodadas anteriores continuam contando no veredito. O the-judge limita a revisão do mesmo conjunto de achados a três rodadas; divergências restantes são resolvidas, acordadas ou escaladas.']
);
document.addEventListener('quest-state-changed',banner);
banner();
Object.defineProperty(window,'SDLCQuestTLC',{value:Object.freeze({version:D.version,getStats:()=>C.stats(B.read()),currentTask:()=>view==='task'?D.modules[moduleIndex].tasks[taskIndex].id:null,guide}),writable:false});
})();
