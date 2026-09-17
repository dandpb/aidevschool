/* DOM controller for the Quest-local harness exercise; no remote invocation. */
(function(){
'use strict';
const H=QuestHarness,B=QuestBridge,$=s=>document.querySelector(s);
const dialog=$('#harness-dialog'),content=$('#harness-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let s=H.create(B.readHarness()),opener=null,busy=false,resetPending=false;
const labels={passed:'✓ Validado',failed:'× Reprovado',stale:'↻ Desatualizado',blocked:'· Bloqueado',ready:'→ Disponível'};
const fieldNames={intent:'Intenção de entrada',plan:'Plano de aceitação',patch:'Implementação candidata',suite:'Suíte de prova',runner:'Condição do verificador',review:'Parecer recebido'};
const choiceNames={
 intent:{incomplete:'Só “Adicionar retry” + done:true',complete:'Problema + resultado + escopo + questão aberta'},
 plan:{happy:'Só casos felizes do próprio tenant',traceable:'Cinco critérios, incluindo casos negativos'},
 patch:{original:'Busca apenas pelo ID — bug de tenant',scoped:'Busca pelo ID e pelo tenant',denyAll:'Retorna null para qualquer entrada'},
 suite:{happy:'Suíte superficial: apenas casos felizes',contract:'Contrato completo + baseline + mutante',placebo:'Placebo: só conta as fixtures'},
 runner:{normal:'Executar as funções JavaScript locais',unavailable:'Injetar indisponibilidade — nenhum resultado',crash:'Injetar exceção do verificador'},
 review:{self:'O próprio autor diz “aprovado”',stale:'Parecer de uma candidata antiga',blocker:'Parecer atual, mas com blocker aberto',current:'Parecer didático atual, sem blocker'}
};
const lessons=[
 {intro:'Uma skill pode produzir uma intenção. O gate precisa conferir o conteúdo de entrada antes de permitir o plano.',why:'O runtime não trata um arquivo chamado intent.md ou um campo done:true como conclusão. Esta regra local exige quatro conteúdos conhecidos.',limit:'Validar campos não prova que a ideia tem valor ou que o responsável aceitou o escopo. Aqui o conteúdo vem de fixtures fictícias.'},
 {intro:'Associe os cinco comportamentos do exercício aos checks que realmente serão executados.',why:'Dois casos felizes não cobrem o isolamento de tenant. A matriz precisa prever as duas negações de acesso e um ID inexistente, além dos dois sucessos.',limit:'A matriz é um contrato didático pequeno. Um projeto real também exige autenticação, concorrência, falhas do destino e outros critérios do seu domínio.'},
 {intro:'Materialize uma candidata identificável. O resultado desta etapa é código para verificar, não uma aprovação de qualidade.',why:'A referência rN identifica a revisão no laboratório. Alterar a candidata invalida implementação, verificação, revisão e pacote — mas preserva a intenção e o plano ainda válidos.',limit:'Não há agente escrevendo código: você escolhe uma função predefinida em memória. O harness-toolkit e o tlc-implement não estão sendo executados.'},
 {intro:'Rode a prova contra a versão anterior, a candidata e um mutante defeituoso. Um erro ou nenhum resultado deve impedir o avanço.',why:'A prova completa precisa rejeitar o bug anterior, aprovar a candidata correta e rejeitar a implementação que nega tudo. Por isso, alguns testes VERMELHOS da baseline e do mutante são esperados.',limit:'São execuções reais de funções JavaScript, mas somente dentro desta página. Não demonstram execução de CI, autenticação, revisão independente ou integração real com o toolkit.'},
 {intro:'Aceite apenas o parecer didático que corresponde à candidata e à verificação atuais, sem bloqueadores pendentes.',why:'Um elogio do autor não é revisão independente. A referência a outra revisão também não serve para esta candidata. Na produção, a identidade e a aprovação precisam ser verificadas fora do workspace.',limit:'Todos os pareceres deste painel são fixtures. O rótulo de um revisor não autentica uma pessoa, e nenhum subagente the-judge é acionado pelo HTML.'},
 {intro:'O último gate exige os cinco recibos atuais. Sem eles, não há pacote local pronto.',why:'O pacote reúne revisão, política didática, checks, estados e timeline. Uma mudança após o verde remove a condição de pacote pronto até que os passos dependentes sejam reexecutados.',limit:'Este JSON não é assinado e não autoriza deploy. O navegador e este runner local não são fronteiras de segurança contra quem pode alterar código, arquivos ou credenciais.'}
];
const goalLabels={order:'Bloquear um salto de etapa',claim:'Recusar “terminei” sem execução',bug:'Detectar a candidata defeituosa',executed:'Executar a prova completa',stale:'Invalidar uma evidência após alteração',package:'Produzir o pacote local'};
function sync(){document.dispatchEvent(new Event('quest-modal'));}
function persist(){B.writeHarness(H.draft(s));}
function updateBanner(){
 const el=$('#harness-banner'),count=H.STEPS.filter(t=>H.valid(s,t.id)).length;
 // Keep an existing focused launch button intact when another part of the game saves.
 if(!el.firstElementChild)el.innerHTML=`<span class="harness-symbol" aria-hidden="true">⌘</span><div><strong>Não basta dizer que executou.</strong><p>Harness Lab · gates, provas e limites de execução.</p><small id="harness-counter"></small></div><button class="secondary" id="harness-launch" data-open-harness="true">Abrir central de execução ↗</button>`;
 $('#harness-counter').textContent=`${count}/6 gates locais atuais · referência: harness-toolkit; integração real pendente`;
}
function field(key){return `<label for="h-field-${key}">${fieldNames[key]}<select id="h-field-${key}" data-h-field="${key}" ${busy?'disabled':''}>${H.OPTIONS[key].map(value=>`<option value="${value}" ${s.inputs[key]===value?'selected':''}>${esc(choiceNames[key][value])}</option>`).join('')}</select></label>`;}
function currentUI(){
 switch(s.selected){
 case 0:return field('intent');
 case 1:return field('plan');
 case 2:return field('patch')+`<pre class="h-code" id="h-candidate-source">${esc(H.code[s.inputs.patch])}</pre>`;
 case 3:return field('suite')+field('runner')+`<p class="h-empty">Candidata: <strong>r${s.revisions[2]} · ${esc(s.inputs.patch)}</strong>. Para corrigi-la, volte à etapa Implementar.</p>`;
 case 4:return field('review');
 default:return `<ul class="h-checklist">${H.STEPS.slice(0,5).map(t=>`<li>${H.valid(s,t.id)?'✓':'○'} <strong>${esc(t.title)}</strong> · ${esc(labels[H.status(s,t.id)])}</li>`).join('')}</ul><p class="h-notice"><strong>Produção: não autorizada.</strong> O pacote local não recebe credenciais nem aciona deploy.</p>`;
 }
}
function results(){
 if(s.selected!==3)return '';
 const last=s.lastTests;
 if(!last)return `<p class="h-empty">Nenhuma asserção executada nesta sessão. Primeiro materialize a candidata, depois execute o verificador.</p>`;
 return `<section class="h-results" aria-label="Resultados das asserções"><h4>Execução r${last.codeRevision} ${last.stale?'· DESATUALIZADA':''}</h4><small>Baseline e mutante devem falhar; a candidata correta deve passar. O exit code de cada grupo está explícito.</small>${last.versions.map(v=>`<div class="h-result-version"><h4>${esc(v.label)} · exit ${v.exitCode}</h4>${v.checks.map(c=>`<div class="h-test ${c.pass?'':'fail'}"><em>${c.pass?'PASS':'FAIL'}</em><span>${esc(c.label)}<br>obtido: ${esc(JSON.stringify(c.actual))} · esperado: ${esc(JSON.stringify(c.expected))}</span></div>`).join('')}</div>`).join('')}</section>`;
}
function render(focus){
 const t=H.STEPS[s.selected],lesson=lessons[s.selected],last=s.log.at(-1),count=H.STEPS.filter(x=>H.valid(s,x.id)).length;
 const ready=H.valid(s,'package'),disabled=busy?'disabled':'';
 const oldScroll=dialog.scrollTop;
 content.innerHTML=`<div class="dialog-top"><span class="eyebrow">HARNESS LAB · EXECUÇÃO LOCAL DIDÁTICA</span><button class="close-btn" data-h-action="close" aria-label="Fechar central de execução">×</button></div><div class="h-main">
 <h2 id="harness-title" tabindex="-1">Da instrução à <em>execução comprovada.</em></h2>
 <p class="h-lead">Conduza a feature de retry por seis gates. Experimente atalhos, falhas e alterações depois do verde. O motor só avança com as pré-condições e os resultados exigidos.</p>
 <div class="h-notice"><strong>harness-toolkit · Integração real pendente</strong><details><summary>Fonte e limites da integração</summary><p><a href="${H.REPO}" target="_blank" rel="noopener noreferrer">dandpb/harness-toolkit ↗</a> é a referência solicitada. Seu conteúdo não foi acessível nesta revisão. O código deste laboratório é do Quest; não presume comandos, APIs ou garantias do toolkit.</p></details></div>
 <div class="h-legend"><span>01 Skill orienta</span><span>02 Gate verifica</span><span>03 Infra limita autoridade</span><span id="h-gate-count">${count}/6 gates atuais</span></div>
 <nav class="h-chain" aria-label="Etapas do laboratório">${H.STEPS.map((step,i)=>`<button class="h-step" id="h-step-${i}" data-h-step="${i}" aria-current="${s.selected===i}" data-state="${H.status(s,step.id)}" ${disabled}><span class="h-step-num">0${i+1}</span><strong>${esc(step.title)}</strong><span class="h-state">${labels[H.status(s,step.id)]}</span></button>`).join('')}</nav>
 <div class="h-workbench"><section class="h-work" aria-label="Gate selecionado"><span class="h-step-kind">${esc(t.skill)} / ${esc(t.artifact)}</span><h3>${esc(t.subtitle)}</h3><p>${esc(lesson.intro)}</p>
 <div class="h-config">${currentUI()}</div>
 <div class="h-control-row"><button class="primary" id="h-execute" data-h-action="execute" ${disabled}>${busy?'Executando…':s.selected===3?'Executar verificador':s.selected===5?'Validar pacote local':'Executar gate'}</button>${s.selected<5?`<button class="secondary" data-h-action="next" ${disabled}>Próxima etapa →</button>`:''}<small>${s.failures[t.id]||0}/${H.LIMIT} falhas nesta etapa</small></div>
 ${last?`<div class="h-status-note" id="h-feedback" tabindex="-1" role="status" aria-live="polite" data-outcome="${esc(last.outcome)}"><strong>${esc(last.action)} · ${esc(last.outcome)}</strong><br>${esc(last.message)}</div>`:''}
 ${s.halted?'<div class="h-budget" role="alert">Execução interrompida: orçamento esgotado. Não há repetição automática. Exporte o diagnóstico, revise o problema e só então inicie uma nova execução.</div>':''}
 ${ready?'<div class="h-cert"><strong>Pacote local pronto ✓</strong><br>Os seis gates têm recibos atuais. Toolkit real, revisão independente e autorização de produção continuam não executados.</div>':''}
 <details class="h-explain"><summary>Entenda a regra e seu limite</summary><p>${esc(lesson.why)}</p><p><strong>O que isso não prova:</strong> ${esc(lesson.limit)}</p></details>${results()}</section>
 <aside class="h-panel"><h3>Teste os limites.</h3><p>Sabote o fluxo para descobrir o que o motor recusa. Os botões abaixo não têm efeito fora deste jogo.</p><div class="h-panel-actions"><button id="h-skip" data-h-action="skip" ${disabled}>↗ Pular para o pacote</button><button id="h-declare" data-h-action="declare" ${disabled}>“Terminei tudo” sem executar</button><button id="h-edit" data-h-action="edit" ${disabled}>↻ Alterar código após o verde</button><button id="h-production" data-h-action="production" ${disabled}>↑ Tentar acionar produção</button></div>
 <div class="h-goals">${Object.entries(goalLabels).map(([key,label])=>`<div class="h-goal" data-goal="${key}"><span>${s.goals[key]?'✓':'○'}</span>${esc(label)}</div>`).join('')}</div><p>Objetivos didáticos, sem XP extra. Um recibo vencido nunca conta como gate atual.</p></aside></div>
 <details class="h-journal" id="h-journal"><summary>Timeline · ${s.log.length} eventos desta execução</summary><div class="h-events">${s.log.length?s.log.slice().reverse().map(e=>`<div class="h-event"><code>#${e.seq}</code><code>${esc(e.outcome)}</code><p>${esc(e.message)}</p></div>`).join(''):'<p class="h-empty">Nenhuma ação registrada. Selecionar uma etapa não a executa.</p>'}</div></details>
 <details class="h-integration"><summary>Como esta camada se conecta às skills e ao toolkit</summary><div class="h-integrations-grid"><div><strong>Skills / intenção</strong><span>Discover prepara entradas; Plan liga critérios; Implement produz a candidata; Judge revisa. Nenhuma delas é chamada por este HTML.</span></div><div><strong>Quest / exercício</strong><span>Motor local controla ordem, executa microtestes, invalida recibos, registra falhas e limita tentativas.</span></div><div><strong>Toolkit / integração pendente</strong><span>Precisamos verificar o código, os comandos e os formatos reais do repositório. Não há adaptador confirmado ou garantia atribuída a ele.</span></div></div><p>No pacote-fonte, <code>node tools/quest-gate.cjs</code> executa o build e os testes deste jogo, com logs, hashes e códigos de saída. É um runner próprio do Quest, não um comando do harness-toolkit.</p><p><strong>Fronteira de confiança:</strong> alterar o runner, a política ou os recibos no mesmo ambiente pode burlar um controle local. Merge e produção exigem políticas, identidades e verificadores protegidos fora da autoridade do candidato.</p><button class="secondary" data-h-action="guide">Baixar guia de integração e limites ↓</button></details>
 <div class="h-footer"><button class="secondary" id="h-report" data-h-action="report">Exportar diagnóstico JSON ↓</button><button class="secondary" id="h-package" data-h-action="package" ${ready?'':'disabled'}>Baixar pacote validado ↓</button><button class="secondary" data-h-action="backup">Backup do jogo ↓</button><button class="secondary" id="h-new-run" data-h-action="new-run" ${disabled}>Nova execução</button><p>O backup guarda as entradas deste laboratório, não aprovações. Ao recarregar ou importar, reexecute os gates. A timeline atual pode ser preservada pelo diagnóstico JSON. Campanha e TLC mantêm seu progresso.</p></div>
 ${resetPending?'<div class="h-reset" role="alert"><strong>Iniciar outra execução?</strong><p>A timeline e os recibos desta sessão serão descartados. Exporte o diagnóstico antes de confirmar. As entradas serão mantidas; nenhuma correção é feita automaticamente. A campanha e a oficina TLC não serão apagadas.</p><button class="secondary" data-h-action="cancel-reset">Cancelar</button><button class="secondary" id="h-confirm-reset" data-h-action="confirm-reset">Revisei o problema; iniciar nova execução</button></div>':''}
 </div>`;
 dialog.scrollTop=oldScroll;
 if(focus){const el=content.querySelector('#'+focus);if(el)el.focus({preventScroll:true});}
 updateBanner();
}
function open(){
 opener=document.activeElement;
 for(const other of document.querySelectorAll('dialog[open]'))if(other!==dialog)other.close();
 resetPending=false;render();if(!dialog.open)dialog.showModal();dialog.scrollTop=0;sync();$('#harness-title').focus({preventScroll:true});
}
async function run(id){
 if(busy)return;busy=true;render();
 await new Promise(resolve=>requestAnimationFrame(resolve));
 s=H.execute(s,id);busy=false;persist();render('h-feedback');
}
function guide(){return `# SDLC Quest v1.3 — execução, gates e evidências\n\n## Estado da integração\n\nReferência fornecida: ${H.REPO}\nO repositório não pôde ser lido nesta revisão. Nenhuma API, comando, licença, formato ou garantia do harness-toolkit foi verificada. O HTML e o runner são implementações próprias do Quest, não uma integração real confirmada.\n\n## Uso no jogo\n\n1. Abra a central de execução.\n2. Experimente pular direto para o pacote ou declarar tudo pronto: o motor deve recusar.\n3. Descobrir: selecione problema, resultado, escopo e questão aberta; execute o gate.\n4. Planejar: selecione os cinco critérios, incluindo os negativos; execute.\n5. Implementar: materialize uma candidata. A versão original contém um bug de tenant.\n6. Verificar: execute a suíte completa. Inspecione baseline, candidata e mutante.\n7. Corrija a candidata para busca por ID e tenant; reexecute implementação e verificação.\n8. Revisar: selecione o parecer didático atual, sem blocker; execute.\n9. Validar pacote: os cinco recibos anteriores devem ser atuais. Exporte o JSON.\n10. Altere o código após o verde e observe os recibos desatualizados. Produção continua negada.\n\n## O que realmente executa\n\nO HTML roda funções JavaScript locais sobre dados fictícios. A suíte completa produz 15 asserções em três versões. Ela deve reprovar a baseline e o mutante, mas aprovar a candidata correta. Não chama agentes, GitHub, npm, CI ou o toolkit.\n\nNo pacote-fonte, execute: \`node tools/quest-gate.cjs\`. Esse runner próprio reconstrói o HTML, executa testes de regras e jornadas de navegador e grava logs, hashes e códigos de saída. Requer Node, Python, Playwright e Chromium; dependências faltantes são falhas, não aprovações. Nenhuma instalação é feita automaticamente.\n\n## Mapeamento proposto; não é API do toolkit\n\n- tlc-discover → intenção/decisões → validação das entradas.\n- tlc-plan → critérios/checks → validação da matriz.\n- tlc-implement → revisão candidata → execução do verificador.\n- the-judge → achados/parecer → pendências e vínculo com a revisão.\n- Runner externo → logs/exit codes/identidade → evidência de execução rastreável.\n- Infra protegida → identidade/aprovação independente → autorização de merge/release.\n\n## Para concluir a integração real\n\nVerificar README, commit, licença, executável, estados, formatos de entrada/saída e testes do repositório. Depois implementar um adaptador sobre a interface efetivamente encontrada, sem inferir comandos. Validar falta de etapa, falha/timeout, evidência antiga, alteração da política, budget e indisponibilidade do executor. Conferir as permissões fora do workspace.\n\n## Limites\n\nCompletar etapas não prova a correção de todos os requisitos. JSON local pode ser alterado. O backup restaura entradas, não execução. Não houve revisão independente. Não há autorização de produção. O runner local não é uma sandbox nem controla um atacante com acesso aos seus arquivos.\n`;}
document.addEventListener('click',e=>{if(e.target.closest('[data-open-harness]'))open();});
content.addEventListener('change',e=>{
 const key=e.target.dataset.hField;if(!key||busy)return;
 s=H.change(s,key,e.target.value);persist();render('h-field-'+key);
});
content.addEventListener('click',e=>{
 const step=e.target.closest('[data-h-step]');if(step&&!busy){s.selected=Number(step.dataset.hStep);persist();render('h-step-'+s.selected);if(innerWidth<800)content.querySelector('.h-work').scrollIntoView({block:'start'});return;}
 const b=e.target.closest('[data-h-action]');if(!b)return;const a=b.dataset.hAction;
 if(a==='close'){dialog.close();return;}
 if(busy)return;
 switch(a){
 case 'execute':run(H.STEPS[s.selected].id);break;
 case 'next':s.selected=Math.min(5,s.selected+1);persist();render('h-step-'+s.selected);break;
 case 'skip':run('package');break;
 case 'declare':run('declare');break;
 case 'production':run('production');break;
 case 'edit':s=H.change(s,'patch',s.inputs.patch==='scoped'?'original':'scoped');persist();render('h-feedback');break;
 case 'new-run':resetPending=true;render('h-confirm-reset');$('#h-confirm-reset').scrollIntoView({block:'nearest'});break;
 case 'cancel-reset':resetPending=false;render('h-new-run');break;
 case 'confirm-reset':s=H.create(H.draft(s));s.restored=false;s.selected=0;resetPending=false;persist();render('harness-title');B.toast('Nova execução iniciada; os problemas não foram corrigidos automaticamente.');break;
 case 'report':B.download('Quest-Harness-diagnostico.json',JSON.stringify(H.report(s),null,2),'application/json');break;
 case 'package':if(H.valid(s,'package'))B.download('Quest-Harness-pacote-local.json',JSON.stringify(H.report(s),null,2),'application/json');else B.toast('Pacote bloqueado: faltam recibos atuais.');break;
 case 'guide':B.download('Quest-Harness-guia.md',guide());break;
 case 'backup':B.backup();break;
 }
});
dialog.addEventListener('close',()=>{sync();if(!document.querySelector('dialog[open]')){if(opener?.isConnected)opener.focus({preventScroll:true});else $('#harness-launch')?.focus({preventScroll:true});}});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
document.addEventListener('quest-state-changed',updateBanner);
document.addEventListener('quest-state-replaced',()=>{s=H.create(B.readHarness());resetPending=false;updateBanner();if(dialog.open)render('harness-title');});
QuestData.glossary.push(
 ['Harness Lab e harness-toolkit','O laboratório de execução do Quest usa um motor local próprio para ensinar gates. O repositório dandpb/harness-toolkit foi indicado como referência, mas seu conteúdo não foi acessível nesta revisão; integração real pendente.'],
 ['Recibo de execução','Registro de passo, entradas, revisão, política e checks executados. Um recibo local não é uma assinatura nem prova, sozinho, a identidade de quem executou.'],
 ['Evidência desatualizada','Quando código, contrato ou política relevante muda, resultados dependentes precisam ser reavaliados. Um teste verde de outra revisão não libera a candidata atual.'],
 ['Ausência de resultado','Sem verificador, com erro ou sem checks, o gate não deve converter ausência de evidência em sucesso. Falha é registrada; um orçamento impede repetições automáticas ilimitadas.']
);
Object.defineProperty(window,'SDLCQuestHarness',{value:Object.freeze({version:'1.3.0',getState:()=>JSON.parse(JSON.stringify(s)),getReport:()=>H.report(s),guide}),writable:false});
updateBanner();
})();
