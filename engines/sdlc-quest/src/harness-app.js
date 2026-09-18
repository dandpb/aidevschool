/* DOM controller for the Quest-local harness exercise; no remote invocation.
 * Chrome is bilingual via QuestLang; exported guide/report stay pt-BR documents. */
(function(){
'use strict';
const H=QuestHarness,B=QuestBridge,QL=QuestLang,$=s=>document.querySelector(s);
const dialog=$('#harness-dialog'),content=$('#harness-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STRINGS={
pt:{
 labels:{passed:'✓ Validado',failed:'× Reprovado',stale:'↻ Desatualizado',blocked:'· Bloqueado',ready:'→ Disponível'},
 fieldNames:{intent:'Intenção de entrada',plan:'Plano de aceitação',patch:'Implementação candidata',suite:'Suíte de prova',runner:'Condição do verificador',review:'Parecer recebido'},
 choiceNames:{
  intent:{incomplete:'Só “Adicionar retry” + done:true',complete:'Problema + resultado + escopo + questão aberta'},
  plan:{happy:'Só casos felizes do próprio tenant',traceable:'Cinco critérios, incluindo casos negativos'},
  patch:{original:'Busca apenas pelo ID — bug de tenant',scoped:'Busca pelo ID e pelo tenant',denyAll:'Retorna null para qualquer entrada'},
  suite:{happy:'Suíte superficial: apenas casos felizes',contract:'Contrato completo + baseline + mutante',placebo:'Placebo: só conta as fixtures'},
  runner:{normal:'Executar as funções JavaScript locais',unavailable:'Injetar indisponibilidade — nenhum resultado',crash:'Injetar exceção do verificador'},
  review:{self:'O próprio autor diz “aprovado”',stale:'Parecer de uma candidata antiga',blocker:'Parecer atual, mas com blocker aberto',current:'Parecer didático atual, sem blocker'}
 },
 lessons:[
  {intro:'Uma skill pode produzir uma intenção. O gate precisa conferir o conteúdo de entrada antes de permitir o plano.',why:'O runtime não trata um arquivo chamado intent.md ou um campo done:true como conclusão. Esta regra local exige quatro conteúdos conhecidos.',limit:'Validar campos não prova que a ideia tem valor ou que o responsável aceitou o escopo. Aqui o conteúdo vem de fixtures fictícias.'},
  {intro:'Associe os cinco comportamentos do exercício aos checks que realmente serão executados.',why:'Dois casos felizes não cobrem o isolamento de tenant. A matriz precisa prever as duas negações de acesso e um ID inexistente, além dos dois sucessos.',limit:'A matriz é um contrato didático pequeno. Um projeto real também exige autenticação, concorrência, falhas do destino e outros critérios do seu domínio.'},
  {intro:'Materialize uma candidata identificável. O resultado desta etapa é código para verificar, não uma aprovação de qualidade.',why:'A referência rN identifica a revisão no laboratório. Alterar a candidata invalida implementação, verificação, revisão e pacote — mas preserva a intenção e o plano ainda válidos.',limit:'Não há agente escrevendo código: você escolhe uma função predefinida em memória. O harness-toolkit e o tlc-implement não estão sendo executados.'},
  {intro:'Rode a prova contra a versão anterior, a candidata e um mutante defeituoso. Um erro ou nenhum resultado deve impedir o avanço.',why:'A prova completa precisa rejeitar o bug anterior, aprovar a candidata correta e rejeitar a implementação que nega tudo. Por isso, alguns testes VERMELHOS da baseline e do mutante são esperados.',limit:'São execuções reais de funções JavaScript, mas somente dentro desta página. Não demonstram execução de CI, autenticação, revisão independente ou integração real com o toolkit.'},
  {intro:'Aceite apenas o parecer didático que corresponde à candidata e à verificação atuais, sem bloqueadores pendentes.',why:'Um elogio do autor não é revisão independente. A referência a outra revisão também não serve para esta candidata. Na produção, a identidade e a aprovação precisam ser verificadas fora do workspace.',limit:'Todos os pareceres deste painel são fixtures. O rótulo de um revisor não autentica uma pessoa, e nenhum subagente the-judge é acionado pelo HTML.'},
  {intro:'O último gate exige os cinco recibos atuais. Sem eles, não há pacote local pronto.',why:'O pacote reúne revisão, política didática, checks, estados e timeline. Uma mudança após o verde remove a condição de pacote pronto até que os passos dependentes sejam reexecutados.',limit:'Este JSON não é assinado e não autoriza deploy. O navegador e este runner local não são fronteiras de segurança contra quem pode alterar código, arquivos ou credenciais.'}
 ],
 goalLabels:{order:'Bloquear um salto de etapa',claim:'Recusar “terminei” sem execução',bug:'Detectar a candidata defeituosa',executed:'Executar a prova completa',stale:'Invalidar uma evidência após alteração',package:'Produzir o pacote local'},
 bannerTitle:'Não basta dizer que executou.',bannerLead:'Harness Lab · gates, provas e limites de execução.',bannerCounter:n=>`${n}/6 gates locais atuais · referência: harness-toolkit; integração real pendente`,bannerOpen:'Abrir central de execução ↗',
 closeAria:'Fechar central de execução',eyebrow:'HARNESS LAB · EXECUÇÃO LOCAL DIDÁTICA',mainTitle:'Da instrução à <em>execução comprovada.</em>',lead:'Conduza a feature de retry por seis gates. Experimente atalhos, falhas e alterações depois do verde. O motor só avança com as pré-condições e os resultados exigidos.',
 noticeHead:'harness-toolkit · Integração real pendente',noticeSummary:'Fonte e limites da integração',noticeBody:repo=>`<a href="${repo}" target="_blank" rel="noopener noreferrer">dandpb/harness-toolkit ↗</a> é a referência solicitada. Seu conteúdo não foi acessível nesta revisão. O código deste laboratório é do Quest; não presume comandos, APIs ou garantias do toolkit.`,
 legend1:'01 Skill orienta',legend2:'02 Gate verifica',legend3:'03 Infra limita autoridade',gateCount:n=>`${n}/6 gates atuais`,chainAria:'Etapas do laboratório',workAria:'Gate selecionado',
 candidateNote:(rev,patch)=>`Candidata: <strong>r${rev} · ${patch}</strong>. Para corrigi-la, volte à etapa Implementar.`,
 productionNotice:'<strong>Produção: não autorizada.</strong> O pacote local não recebe credenciais nem aciona deploy.',
 resultsAria:'Resultados das asserções',resultsNone:'Nenhuma asserção executada nesta sessão. Primeiro materialize a candidata, depois execute o verificador.',resultsHead:(rev,stale)=>`Execução r${rev} ${stale?'· DESATUALIZADA':''}`,resultsNote:'Baseline e mutante devem falhar; a candidata correta deve passar. O exit code de cada grupo está explícito.',exitLine:(label,code)=>`${label} · exit ${code}`,gotExpected:(actual,expected)=>`obtido: ${actual} · esperado: ${expected}`,
 executeBusy:'Executando…',executeVerify:'Executar verificador',executePackage:'Validar pacote local',executeGate:'Executar gate',next:'Próxima etapa →',failures:(n,limit)=>`${n}/${limit} falhas nesta etapa`,
 halted:'Execução interrompida: orçamento esgotado. Não há repetição automática. Exporte o diagnóstico, revise o problema e só então inicie uma nova execução.',
 cert:'<strong>Pacote local pronto ✓</strong><br>Os seis gates têm recibos atuais. Toolkit real, revisão independente e autorização de produção continuam não executados.',
 explainSummary:'Entenda a regra e seu limite',notProve:'O que isso não prova:',
 panelTitle:'Teste os limites.',panelLead:'Sabote o fluxo para descobrir o que o motor recusa. Os botões abaixo não têm efeito fora deste jogo.',skipBtn:'↗ Pular para o pacote',declareBtn:'“Terminei tudo” sem executar',editBtn:'↻ Alterar código após o verde',productionBtn:'↑ Tentar acionar produção',goalsNote:'Objetivos didáticos, sem XP extra. Um recibo vencido nunca conta como gate atual.',
 timeline:n=>`Timeline · ${n} eventos desta execução`,timelineEmpty:'Nenhuma ação registrada. Selecionar uma etapa não a executa.',
 integrationSummary:'Como esta camada se conecta às skills e ao toolkit',
 integrations:[
  {head:'Skills / intenção',body:'Discover prepara entradas; Plan liga critérios; Implement produz a candidata; Judge revisa. Nenhuma delas é chamada por este HTML.'},
  {head:'Quest / exercício',body:'Motor local controla ordem, executa microtestes, invalida recibos, registra falhas e limita tentativas.'},
  {head:'Toolkit / integração pendente',body:'Precisamos verificar o código, os comandos e os formatos reais do repositório. Não há adaptador confirmado ou garantia atribuída a ele.'}
 ],
 integrationRunner:'No pacote-fonte, <code>node tools/quest-gate.cjs</code> executa o build e os testes deste jogo, com logs, hashes e códigos de saída. É um runner próprio do Quest, não um comando do harness-toolkit.',
 integrationTrust:'<strong>Fronteira de confiança:</strong> alterar o runner, a política ou os recibos no mesmo ambiente pode burlar um controle local. Merge e produção exigem políticas, identidades e verificadores protegidos fora da autoridade do candidato.',
 guideBtn:'Baixar guia de integração e limites ↓',reportBtn:'Exportar diagnóstico JSON ↓',packageBtn:'Baixar pacote validado ↓',backupBtn:'Backup do jogo ↓',newRunBtn:'Nova execução',
 footerNote:'O backup guarda as entradas deste laboratório, não aprovações. Ao recarregar ou importar, reexecute os gates. A timeline atual pode ser preservada pelo diagnóstico JSON. Campanha e TLC mantêm seu progresso.',
 resetTitle:'Iniciar outra execução?',resetBody:'A timeline e os recibos desta sessão serão descartados. Exporte o diagnóstico antes de confirmar. As entradas serão mantidas; nenhuma correção é feita automaticamente. A campanha e a oficina TLC não serão apagadas.',cancelBtn:'Cancelar',confirmReset:'Revisei o problema; iniciar nova execução',
 toastNewRun:'Nova execução iniciada; os problemas não foram corrigidos automaticamente.',toastPackageBlocked:'Pacote bloqueado: faltam recibos atuais.'
},
en:{
 labels:{passed:'✓ Validated',failed:'× Rejected',stale:'↻ Stale',blocked:'· Blocked',ready:'→ Ready'},
 fieldNames:{intent:'Input intent',plan:'Acceptance plan',patch:'Candidate implementation',suite:'Proof suite',runner:'Verifier condition',review:'Received review'},
 choiceNames:{
  intent:{incomplete:'Only “Add retry” + done:true',complete:'Problem + outcome + scope + open question'},
  plan:{happy:'Only own-tenant happy paths',traceable:'Five criteria, including negative cases'},
  patch:{original:'Look up by ID only — tenant bug',scoped:'Look up by ID and tenant',denyAll:'Return null for any input'},
  suite:{happy:'Shallow suite: happy paths only',contract:'Full contract + baseline + mutant',placebo:'Placebo: only counts fixtures'},
  runner:{normal:'Run the local JavaScript functions',unavailable:'Inject unavailability — no result',crash:'Inject a verifier exception'},
  review:{self:'The author themself says “approved”',stale:'Review of an old candidate',blocker:'Current review, but with an open blocker',current:'Current teaching review, no blocker'}
 },
 lessons:[
  {intro:'A skill can produce an intent. The gate must check the input content before allowing the plan.',why:'The runtime does not treat a file named intent.md or a done:true field as a conclusion. This local rule requires four known contents.',limit:'Validating fields does not prove the idea has value or that the owner accepted the scope. Here the content comes from fictional fixtures.'},
  {intro:'Bind the five exercise behaviors to the checks that will actually run.',why:'Two happy paths do not cover tenant isolation. The matrix must foresee the two access denials and a missing ID, besides the two successes.',limit:'The matrix is a small teaching contract. A real project also requires authentication, concurrency, destination failures and other criteria from your domain.'},
  {intro:'Materialize an identifiable candidate. This step produces code to verify, not a quality approval.',why:'The rN reference identifies the revision in the lab. Changing the candidate invalidates implementation, verification, review and package — but preserves the still-valid intent and plan.',limit:'No agent writes code here: you pick a predefined in-memory function. The harness-toolkit and tlc-implement are not running.'},
  {intro:'Run the proof against the previous version, the candidate and a faulty mutant. An error or no result must block advancement.',why:'The complete proof must reject the previous bug, approve the correct candidate and reject the deny-everything implementation. That is why some RED baseline and mutant tests are expected.',limit:'These are real JavaScript executions, but only inside this page. They do not demonstrate CI execution, authentication, independent review or a real toolkit integration.'},
  {intro:'Accept only the teaching review that matches the current candidate and verification, with no open blockers.',why:'Praise from the author is not an independent review. A reference to another revision does not serve this candidate either. In production, identity and approval must be verified outside the workspace.',limit:'Every review in this panel is a fixture. A reviewer label does not authenticate a person, and no the-judge subagent is invoked by this HTML.'},
  {intro:'The last gate requires the five current receipts. Without them, there is no ready local package.',why:'The package gathers revision, teaching policy, checks, states and timeline. A change after green removes the ready-package condition until the dependent steps are re-executed.',limit:'This JSON is not signed and does not authorize deploy. The browser and this local runner are not security boundaries against someone able to change code, files or credentials.'}
 ],
 goalLabels:{order:'Block a step jump',claim:'Refuse “done” without execution',bug:'Detect the faulty candidate',executed:'Run the complete proof',stale:'Invalidate evidence after a change',package:'Produce the local package'},
 bannerTitle:'Saying you ran it is not enough.',bannerLead:'Harness Lab · gates, proofs and execution limits.',bannerCounter:n=>`${n}/6 current local gates · reference: harness-toolkit; real integration pending`,bannerOpen:'Open the execution hub ↗',
 closeAria:'Close the execution hub',eyebrow:'HARNESS LAB · LOCAL TEACHING EXECUTION',mainTitle:'From instruction to <em>proven execution.</em>',lead:'Guide the retry feature through six gates. Try shortcuts, failures and post-green changes. The engine only advances with the required preconditions and results.',
 noticeHead:'harness-toolkit · Real integration pending',noticeSummary:'Source and limits of the integration',noticeBody:repo=>`<a href="${repo}" target="_blank" rel="noopener noreferrer">dandpb/harness-toolkit ↗</a> is the requested reference. Its content was not accessible in this revision. This lab’s code belongs to Quest; it assumes no toolkit commands, APIs or guarantees.`,
 legend1:'01 Skill guides',legend2:'02 Gate verifies',legend3:'03 Infra limits authority',gateCount:n=>`${n}/6 current gates`,chainAria:'Lab steps',workAria:'Selected gate',
 candidateNote:(rev,patch)=>`Candidate: <strong>r${rev} · ${patch}</strong>. To fix it, go back to the Implement step.`,
 productionNotice:'<strong>Production: not authorized.</strong> The local package receives no credentials and triggers no deploy.',
 resultsAria:'Assertion results',resultsNone:'No assertion executed in this session. First materialize the candidate, then run the verifier.',resultsHead:(rev,stale)=>`Execution r${rev} ${stale?'· STALE':''}`,resultsNote:'Baseline and mutant must fail; the correct candidate must pass. Each group’s exit code is explicit.',exitLine:(label,code)=>`${label} · exit ${code}`,gotExpected:(actual,expected)=>`got: ${actual} · expected: ${expected}`,
 executeBusy:'Running…',executeVerify:'Run verifier',executePackage:'Validate local package',executeGate:'Run gate',next:'Next step →',failures:(n,limit)=>`${n}/${limit} failures in this step`,
 halted:'Execution halted: budget spent. There is no automatic repetition. Export the diagnosis, review the problem, and only then start a new run.',
 cert:'<strong>Local package ready ✓</strong><br>The six gates have current receipts. Real toolkit, independent review and production authorization remain not executed.',
 explainSummary:'Understand the rule and its limit',notProve:'What this does not prove:',
 panelTitle:'Test the limits.',panelLead:'Sabotage the flow to discover what the engine refuses. The buttons below have no effect outside this game.',skipBtn:'↗ Skip to the package',declareBtn:'“Done with everything” without executing',editBtn:'↻ Change code after green',productionBtn:'↑ Try to trigger production',goalsNote:'Teaching goals, no extra XP. An expired receipt never counts as a current gate.',
 timeline:n=>`Timeline · ${n} events in this run`,timelineEmpty:'No action recorded. Selecting a step does not execute it.',
 integrationSummary:'How this layer connects to the skills and the toolkit',
 integrations:[
  {head:'Skills / intent',body:'Discover prepares inputs; Plan binds criteria; Implement produces the candidate; Judge reviews. None of them is called by this HTML.'},
  {head:'Quest / exercise',body:'The local engine controls order, runs microtests, invalidates receipts, records failures and limits attempts.'},
  {head:'Toolkit / pending integration',body:'We must verify the repository’s real code, commands and formats. There is no confirmed adapter or guarantee attributed to it.'}
 ],
 integrationRunner:'In the source package, <code>node tools/quest-gate.cjs</code> runs this game’s build and tests, with logs, hashes and exit codes. It is Quest’s own runner, not a harness-toolkit command.',
 integrationTrust:'<strong>Trust boundary:</strong> changing the runner, the policy or the receipts in the same environment can bypass a local control. Merge and production require policies, identities and protected verifiers outside the candidate’s authority.',
 guideBtn:'Download integration and limits guide ↓',reportBtn:'Export JSON diagnosis ↓',packageBtn:'Download validated package ↓',backupBtn:'Game backup ↓',newRunBtn:'New run',
 footerNote:'The backup stores this lab’s inputs, not approvals. On reload or import, rerun the gates. The current timeline can be preserved by the JSON diagnosis. Campaign and TLC keep their progress.',
 resetTitle:'Start another run?',resetBody:'This session’s timeline and receipts will be discarded. Export the diagnosis before confirming. Inputs are kept; nothing is fixed automatically. The campaign and the TLC workshop will not be erased.',cancelBtn:'Cancel',confirmReset:'I reviewed the problem; start a new run',
 toastNewRun:'New run started; the problems were not fixed automatically.',toastPackageBlocked:'Package blocked: current receipts are missing.'
}};
const T=(k,...args)=>{const v=(QL.get()==='en'?STRINGS.en[k]:undefined)??STRINGS.pt[k];return typeof v==='function'?v(...args):v;};
const SN=k=>(QL.get()==='en'?STRINGS.en[k]:undefined)??STRINGS.pt[k];
const F=(r,n)=>QL.field(r,n,QL.get());
let s=H.create(B.readHarness()),opener=null,busy=false,resetPending=false;
function sync(){document.dispatchEvent(new Event('quest-modal'));}
function persist(){B.writeHarness(H.draft(s));}
function updateBanner(){
 const el=$('#harness-banner'),count=H.STEPS.filter(t=>H.valid(s,t.id)).length;
 // Keep an existing focused launch button intact when another part of the game saves.
 if(!el.firstElementChild)el.innerHTML=`<span class="harness-symbol" aria-hidden="true">⌘</span><div><strong>${T('bannerTitle')}</strong><p>${T('bannerLead')}</p><small id="harness-counter"></small></div><button class="secondary" id="harness-launch" data-open-harness="true">${T('bannerOpen')}</button>`;
 $('#harness-counter').textContent=T('bannerCounter',count);
}
function field(key){return `<label for="h-field-${key}">${SN('fieldNames')[key]}<select id="h-field-${key}" data-h-field="${key}" ${busy?'disabled':''}>${H.OPTIONS[key].map(value=>`<option value="${value}" ${s.inputs[key]===value?'selected':''}>${esc(SN('choiceNames')[key][value])}</option>`).join('')}</select></label>`;}
function currentUI(){
 switch(s.selected){
 case 0:return field('intent');
 case 1:return field('plan');
 case 2:return field('patch')+`<pre class="h-code" id="h-candidate-source">${esc(H.code[s.inputs.patch])}</pre>`;
 case 3:return field('suite')+field('runner')+`<p class="h-empty">${T('candidateNote',s.revisions[2],esc(s.inputs.patch))}</p>`;
 case 4:return field('review');
 default:return `<ul class="h-checklist">${H.STEPS.slice(0,5).map(t=>`<li>${H.valid(s,t.id)?'✓':'○'} <strong>${esc(F(t,'title'))}</strong> · ${esc(SN('labels')[H.status(s,t.id)])}</li>`).join('')}</ul><p class="h-notice">${T('productionNotice')}</p>`;
 }
}
function results(){
 if(s.selected!==3)return '';
 const last=s.lastTests;
 if(!last)return `<p class="h-empty">${T('resultsNone')}</p>`;
 return `<section class="h-results" aria-label="${T('resultsAria')}"><h4>${esc(T('resultsHead',last.codeRevision,last.stale))}</h4><small>${T('resultsNote')}</small>${last.versions.map(v=>`<div class="h-result-version"><h4>${esc(T('exitLine',v.label,v.exitCode))}</h4>${v.checks.map(c=>`<div class="h-test ${c.pass?'':'fail'}"><em>${c.pass?'PASS':'FAIL'}</em><span>${esc(c.label)}<br>${esc(T('gotExpected',JSON.stringify(c.actual),JSON.stringify(c.expected)))}</span></div>`).join('')}</div>`).join('')}</section>`;
}
function render(focus){
 const t=H.STEPS[s.selected],lesson=SN('lessons')[s.selected],last=s.log.at(-1),count=H.STEPS.filter(x=>H.valid(s,x.id)).length;
 const ready=H.valid(s,'package'),disabled=busy?'disabled':'';
 const oldScroll=dialog.scrollTop;
 content.innerHTML=`<div class="dialog-top"><span class="eyebrow">${T('eyebrow')}</span><button class="close-btn" data-h-action="close" aria-label="${T('closeAria')}">×</button></div><div class="h-main">
 <h2 id="harness-title" tabindex="-1">${T('mainTitle')}</h2>
 <p class="h-lead">${T('lead')}</p>
 <div class="h-notice"><strong>${T('noticeHead')}</strong><details><summary>${T('noticeSummary')}</summary><p>${T('noticeBody',H.REPO)}</p></details></div>
 <div class="h-legend"><span>${T('legend1')}</span><span>${T('legend2')}</span><span>${T('legend3')}</span><span id="h-gate-count">${T('gateCount',count)}</span></div>
 <nav class="h-chain" aria-label="${T('chainAria')}">${H.STEPS.map((step,i)=>`<button class="h-step" id="h-step-${i}" data-h-step="${i}" aria-current="${s.selected===i}" data-state="${H.status(s,step.id)}" ${disabled}><span class="h-step-num">0${i+1}</span><strong>${esc(F(step,'title'))}</strong><span class="h-state">${SN('labels')[H.status(s,step.id)]}</span></button>`).join('')}</nav>
 <div class="h-workbench"><section class="h-work" aria-label="${T('workAria')}"><span class="h-step-kind">${esc(t.skill)} / ${esc(F(t,'artifact'))}</span><h3>${esc(F(t,'subtitle'))}</h3><p>${esc(lesson.intro)}</p>
 <div class="h-config">${currentUI()}</div>
 <div class="h-control-row"><button class="primary" id="h-execute" data-h-action="execute" ${disabled}>${busy?T('executeBusy'):s.selected===3?T('executeVerify'):s.selected===5?T('executePackage'):T('executeGate')}</button>${s.selected<5?`<button class="secondary" data-h-action="next" ${disabled}>${T('next')}</button>`:''}<small>${T('failures',s.failures[t.id]||0,H.LIMIT)}</small></div>
 ${last?`<div class="h-status-note" id="h-feedback" tabindex="-1" role="status" aria-live="polite" data-outcome="${esc(last.outcome)}"><strong>${esc(last.action)} · ${esc(last.outcome)}</strong><br>${esc(last.message)}</div>`:''}
 ${s.halted?`<div class="h-budget" role="alert">${T('halted')}</div>`:''}
 ${ready?`<div class="h-cert">${T('cert')}</div>`:''}
 <details class="h-explain"><summary>${T('explainSummary')}</summary><p>${esc(lesson.why)}</p><p><strong>${T('notProve')}</strong> ${esc(lesson.limit)}</p></details>${results()}</section>
 <aside class="h-panel"><h3>${T('panelTitle')}</h3><p>${T('panelLead')}</p><div class="h-panel-actions"><button id="h-skip" data-h-action="skip" ${disabled}>${T('skipBtn')}</button><button id="h-declare" data-h-action="declare" ${disabled}>${T('declareBtn')}</button><button id="h-edit" data-h-action="edit" ${disabled}>${T('editBtn')}</button><button id="h-production" data-h-action="production" ${disabled}>${T('productionBtn')}</button></div>
 <div class="h-goals">${Object.entries(SN('goalLabels')).map(([key,label])=>`<div class="h-goal" data-goal="${key}"><span>${s.goals[key]?'✓':'○'}</span>${esc(label)}</div>`).join('')}</div><p>${T('goalsNote')}</p></aside></div>
 <details class="h-journal" id="h-journal"><summary>${esc(T('timeline',s.log.length))}</summary><div class="h-events">${s.log.length?s.log.slice().reverse().map(e=>`<div class="h-event"><code>#${e.seq}</code><code>${esc(e.outcome)}</code><p>${esc(e.message)}</p></div>`).join(''):`<p class="h-empty">${T('timelineEmpty')}</p>`}</div></details>
 <details class="h-integration"><summary>${T('integrationSummary')}</summary><div class="h-integrations-grid">${SN('integrations').map(g=>`<div><strong>${esc(g.head)}</strong><span>${esc(g.body)}</span></div>`).join('')}</div><p>${T('integrationRunner')}</p><p>${T('integrationTrust')}</p><button class="secondary" data-h-action="guide">${T('guideBtn')}</button></details>
 <div class="h-footer"><button class="secondary" id="h-report" data-h-action="report">${T('reportBtn')}</button><button class="secondary" id="h-package" data-h-action="package" ${ready?'':'disabled'}>${T('packageBtn')}</button><button class="secondary" data-h-action="backup">${T('backupBtn')}</button><button class="secondary" id="h-new-run" data-h-action="new-run" ${disabled}>${T('newRunBtn')}</button><p>${T('footerNote')}</p></div>
 ${resetPending?`<div class="h-reset" role="alert"><strong>${T('resetTitle')}</strong><p>${T('resetBody')}</p><button class="secondary" data-h-action="cancel-reset">${T('cancelBtn')}</button><button class="secondary" id="h-confirm-reset" data-h-action="confirm-reset">${T('confirmReset')}</button></div>`:''}
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
 s=H.execute(s,id,QL.get());busy=false;persist();render('h-feedback');
}
function guide(){return `# SDLC Quest v1.3 — execução, gates e evidências\n\n## Estado da integração\n\nReferência fornecida: ${H.REPO}\nO repositório não pôde ser lido nesta revisão. Nenhuma API, comando, licença, formato ou garantia do harness-toolkit foi verificada. O HTML e o runner são implementações próprias do Quest, não uma integração real confirmada.\n\n## Uso no jogo\n\n1. Abra a central de execução.\n2. Experimente pular direto para o pacote ou declarar tudo pronto: o motor deve recusar.\n3. Descobrir: selecione problema, resultado, escopo e questão aberta; execute o gate.\n4. Planejar: selecione os cinco critérios, incluindo os negativos; execute.\n5. Implementar: materialize uma candidata. A versão original contém um bug de tenant.\n6. Verificar: execute a suíte completa. Inspecione baseline, candidata e mutante.\n7. Corrija a candidata para busca por ID e tenant; reexecute implementação e verificação.\n8. Revisar: selecione o parecer didático atual, sem blocker; execute.\n9. Validar pacote: os cinco recibos anteriores devem ser atuais. Exporte o JSON.\n10. Altere o código após o verde e observe os recibos desatualizados. Produção continua negada.\n\n## O que realmente executa\n\nO HTML roda funções JavaScript locais sobre dados fictícios. A suíte completa produz 15 asserções em três versões. Ela deve reprovar a baseline e o mutante, mas aprovar a candidata correta. Não chama agentes, GitHub, npm, CI ou o toolkit.\n\nNo pacote-fonte, execute: \`node tools/quest-gate.cjs\`. Esse runner próprio reconstrói o HTML, executa testes de regras e jornadas de navegador e grava logs, hashes e códigos de saída. Requer Node, Python, Playwright e Chromium; dependências faltantes são falhas, não aprovações. Nenhuma instalação é feita automaticamente.\n\n## Mapeamento proposto; não é API do toolkit\n\n- tlc-discover → intenção/decisões → validação das entradas.\n- tlc-plan → critérios/checks → validação da matriz.\n- tlc-implement → revisão candidata → execução do verificador.\n- the-judge → achados/parecer → pendências e vínculo com a revisão.\n- Runner externo → logs/exit codes/identidade → evidência de execução rastreável.\n- Infra protegida → identidade/aprovação independente → autorização de merge/release.\n\n## Para concluir a integração real\n\nVerificar README, commit, licença, executável, estados, formatos de entrada/saída e testes do repositório. Depois implementar um adaptador sobre a interface efetivamente encontrada, sem inferir comandos. Validar falta de etapa, falha/timeout, evidência antiga, alteração da política, budget e indisponibilidade do executor. Conferir as permissões fora do workspace.\n\n## Limites\n\nCompletar etapas não prova a correção de todos os requisitos. JSON local pode ser alterado. O backup restaura entradas, não execução. Não houve revisão independente. Não há autorização de produção. O runner local não é uma sandbox nem controla um atacante com acesso aos seus arquivos.\n`;}
document.addEventListener('click',e=>{if(e.target.closest('[data-open-harness]'))open();});
content.addEventListener('change',e=>{
 const key=e.target.dataset.hField;if(!key||busy)return;
 s=H.change(s,key,e.target.value,QL.get());persist();render('h-field-'+key);
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
 case 'edit':s=H.change(s,'patch',s.inputs.patch==='scoped'?'original':'scoped',QL.get());persist();render('h-feedback');break;
 case 'new-run':resetPending=true;render('h-confirm-reset');$('#h-confirm-reset').scrollIntoView({block:'nearest'});break;
 case 'cancel-reset':resetPending=false;render('h-new-run');break;
 case 'confirm-reset':s=H.create(H.draft(s));s.restored=false;s.selected=0;resetPending=false;persist();render('harness-title');B.toast(T('toastNewRun'));break;
 case 'report':B.download('Quest-Harness-diagnostico.json',JSON.stringify(H.report(s),null,2),'application/json');break;
 case 'package':if(H.valid(s,'package'))B.download('Quest-Harness-pacote-local.json',JSON.stringify(H.report(s),null,2),'application/json');else B.toast(T('toastPackageBlocked'));break;
 case 'guide':B.download('Quest-Harness-guia.md',guide());break;
 case 'backup':B.backup();break;
 }
});
dialog.addEventListener('close',()=>{sync();if(!document.querySelector('dialog[open]')){if(opener?.isConnected)opener.focus({preventScroll:true});else $('#harness-launch')?.focus({preventScroll:true});}});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
document.addEventListener('quest-state-changed',updateBanner);
document.addEventListener('quest-state-replaced',()=>{s=H.create(B.readHarness());resetPending=false;updateBanner();if(dialog.open)render('harness-title');});
document.addEventListener('quest-lang-changed',()=>{$('#harness-banner').innerHTML='';updateBanner();if(dialog.open)render('harness-title');});
QuestData.glossary.push(
 ['Harness Lab e harness-toolkit','O laboratório de execução do Quest usa um motor local próprio para ensinar gates. O repositório dandpb/harness-toolkit foi indicado como referência, mas seu conteúdo não foi acessível nesta revisão; integração real pendente.'],
 ['Recibo de execução','Registro de passo, entradas, revisão, política e checks executados. Um recibo local não é uma assinatura nem prova, sozinho, a identidade de quem executou.'],
 ['Evidência desatualizada','Quando código, contrato ou política relevante muda, resultados dependentes precisam ser reavaliados. Um teste verde de outra revisão não libera a candidata atual.'],
 ['Ausência de resultado','Sem verificador, com erro ou sem checks, o gate não deve converter ausência de evidência em sucesso. Falha é registrada; um orçamento impede repetições automáticas ilimitadas.']
);
Object.defineProperty(window,'SDLCQuestHarness',{value:Object.freeze({version:'1.3.0',getState:()=>JSON.parse(JSON.stringify(s)),getReport:()=>H.report(s),guide}),writable:false});
updateBanner();
})();
