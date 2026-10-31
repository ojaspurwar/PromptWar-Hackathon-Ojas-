const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let anime = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
import('https://esm.sh/animejs@4.1.3').then(module => { anime = module?.animate ? module : (module?.default?.animate ? module.default : module); }).catch(() => {});
function animateTo(targets, options) {
  if (reducedMotion) return Promise.resolve();
  if (anime?.animate) {
    const { fromOpacity, fromTransform, ...params } = options;
    return new Promise(resolve => anime.animate(targets, {
      opacity:[fromOpacity ?? 0,1], translateY:[18,0], scale:[.97,1], duration:500, ease:'out(4)',
      ...params, onComplete:resolve
    }));
  }
  const nodes = typeof targets === 'string' ? $$(targets) : (targets instanceof Element ? [targets] : [...targets]);
  const animations = nodes.map((node, i) => {
    const delay = typeof options.delay === 'function' ? options.delay(i) : (typeof options.delay === 'number' ? options.delay * i : 0);
    return node.animate([
      { opacity: options.fromOpacity ?? 0, transform: options.fromTransform || 'translateY(18px) scale(.97)' },
      { opacity: 1, transform: options.transform || 'translateY(0) scale(1)' }
    ], { duration: options.duration || 500, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both', delay });
  });
  return Promise.all(animations.map(animation => animation.finished.catch(() => {})));
}
async function showCountdown() {
  if (reducedMotion) return;
  const overlay=$('#game-overlay'), count=$('#overlay-count');
  overlay.classList.add('active'); overlay.setAttribute('aria-hidden','false');
  for (const value of ['3','2','1','GO!']) {
    count.textContent=value;
    count.style.animation='none'; void count.offsetWidth; count.style.animation='count-pop .48s cubic-bezier(.16,1,.3,1) both';
    await new Promise(resolve=>setTimeout(resolve, value==='GO!'?380:410));
  }
  overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true');
}
function burstConfetti() {
  if (reducedMotion) return;
  const field=$('#confetti-field'); field.replaceChildren();
  const colors=['#f6ca68','#68e0bc','#a9a4ff','#ff8796','#fff'];
  for(let i=0;i<42;i++) { const piece=document.createElement('i'); piece.style.setProperty('--x',`${Math.random()*100}%`); piece.style.setProperty('--drift',`${(Math.random()-.5)*260}px`); piece.style.setProperty('--spin',`${Math.random()*720-360}deg`); piece.style.setProperty('--confetti-color',colors[i%colors.length]); piece.style.setProperty('--fall',`${900+Math.random()*900}ms`); field.append(piece); }
}
const XP_PER_LEVEL = 150;
const levelRewards = [
  {level:1,title:'Rookie'}, {level:2,title:'Signal Scout'}, {level:3,title:'Inbox Ace'},
  {level:4,title:'Quick Sorter'}, {level:5,title:'Noise Ninja'}, {level:6,title:'Focus Pro'},
  {level:7,title:'Clear Skies'}, {level:8,title:'Inbox Legend'}
];
function readPlayerXP() { try { return Math.max(0,Number(JSON.parse(localStorage.getItem('inboxSprintPlayerXP')||'{"total":0}').total)||0); } catch { return 0; } }
function readDailyRewardLedger() {
  try {
    const saved=JSON.parse(localStorage.getItem('inboxSprintDailyRewards')||'{}');
    if(saved.day===localDateKey()) return {day:saved.day,read:Array.isArray(saved.read)?saved.read:[],actions:Array.isArray(saved.actions)?saved.actions:[]};
  } catch {}
  return {day:localDateKey(),read:[],actions:[]};
}
function playerLevel(totalXP=state.xpTotal) { return Math.floor(totalXP/XP_PER_LEVEL)+1; }
function titleForLevel(level) { return [...levelRewards].reverse().find(reward=>level>=reward.level)?.title || 'Rookie'; }
function renderPlayerLevel() {
  const level=playerLevel(), inLevel=state.xpTotal%XP_PER_LEVEL, next=levelRewards.find(reward=>reward.level>level);
  $('#level-value').textContent=String(level);
  $('#rank-title').textContent=titleForLevel(level);
  $('#xp-fill').style.width=`${inLevel/XP_PER_LEVEL*100}%`;
  $('#xp-level-label').textContent=`${inLevel} / ${XP_PER_LEVEL} XP`;
  $('#next-reward').textContent=next?`Next title: ${next.title} · Level ${next.level}`:'All titles unlocked';
  const progress=$('#xp-progress');
  progress.setAttribute('aria-valuenow',String(inLevel));
  progress.setAttribute('aria-valuetext',`Level ${level}, ${inLevel} of ${XP_PER_LEVEL} XP. ${next?`Next title: ${next.title}`:'All titles unlocked'}.`);
}
function awardXP(category,id,amount) {
  if(!['read','actions'].includes(category))return false;
  const ledger=readDailyRewardLedger();
  if(ledger[category].includes(id))return false;
  const oldLevel=playerLevel(); ledger[category]=[...ledger[category],id].slice(-100);
  try { localStorage.setItem('inboxSprintDailyRewards',JSON.stringify(ledger)); } catch {}
  state.xpTotal+=amount;
  try { localStorage.setItem('inboxSprintPlayerXP',JSON.stringify({total:state.xpTotal})); } catch {}
  renderPlayerLevel();
  const feedback=$('#xp-feedback'); feedback.textContent=`+${amount} XP`;
  feedback.classList.remove('xp-pop'); void feedback.offsetWidth; feedback.classList.add('xp-pop');
  const newLevel=playerLevel();
  if(newLevel>oldLevel) {
    const reward=levelRewards.find(item=>item.level===newLevel);
    const next=levelRewards.find(item=>item.level>newLevel);
    toast(reward?`Level ${newLevel}! New title unlocked: ${reward.title}.`:next?`Level ${newLevel} reached! Keep going for ${next.title}.`:`Level ${newLevel} reached! All titles unlocked.`,'success');
  }
  return true;
}
const state = { messages:[], analyses:{}, mode:'demo', connected:false, account:null, configured:false, started:false, cardsAnimated:false, seconds:180, timer:null, selected:null, done:new Map(), pointsById:new Map(), correctById:new Map(), history:[], score:0, correct:0, decisions:0, xpTotal:readPlayerXP(), pending:null, provider:'openrouter', aiModel:null, lmStudioBaseUrl:null, notice:null };
const reviewRequests = new Map();
let reviewQueue = Promise.resolve();
const avatarClasses = ['','violet','mint','peach','blue','gold','rose'];
const icons = {
  archive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM3 4h18v3H3zm6 7h6"/></svg>',
  trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  keep:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
};
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function getStreakData() {
  try { return JSON.parse(localStorage.getItem('inboxSprintStreak') || '{"count":0,"lastDay":"","days":[]}'); }
  catch { return {count:0,lastDay:'',days:[]}; }
}
function renderStreak() {
  const saved=getStreakData(), today=localDateKey(), yesterdayDate=new Date(); yesterdayDate.setDate(yesterdayDate.getDate()-1);
  const yesterday=localDateKey(yesterdayDate);
  const currentCount=saved.lastDay===today || saved.lastDay===yesterday ? Number(saved.count)||0 : 0;
  $('#streak-value').textContent=currentCount ? `${currentCount} day streak` : 'Start a streak today';
  $('#streak-days').innerHTML=Array.from({length:5},(_,i)=>{
    const monday=new Date();monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-((monday.getDay()+6)%7)+i);
    const key=localDateKey(monday), done=(saved.days||[]).includes(key), isToday=key===today;
    return `<span class="day ${done?'done':''} ${isToday?'today':''}" title="${monday.toLocaleDateString([], {weekday:'long'})}">${monday.toLocaleDateString([], {weekday:'short'}).slice(0,1)}</span>`;
  }).join('');
}
function recordCompletedSprint() {
  const saved=getStreakData(), today=localDateKey(), yesterdayDate=new Date(); yesterdayDate.setDate(yesterdayDate.getDate()-1);
  const yesterday=localDateKey(yesterdayDate);
  if(saved.lastDay===today)return;
  const count=saved.lastDay===yesterday?(Number(saved.count)||0)+1:1;
  const days=[...new Set([...(saved.days||[]),today])].slice(-35);
  try{localStorage.setItem('inboxSprintStreak',JSON.stringify({count,lastDay:today,days}));}catch{}
  renderStreak();
}
async function api(path, options = {}) {
  const response = await fetch(path, { credentials:'same-origin', ...options, headers:{ ...(options.body ? {'content-type':'application/json'} : {}), ...(options.headers || {}) } });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(message, type='') {
  const node = document.createElement('div'); node.className = `toast ${type}`; node.textContent = message; $('#toast-region').append(node);
  setTimeout(() => { node.style.opacity='0'; node.style.transform='translateY(5px)'; setTimeout(() => node.remove(), 220); }, 3400);
}
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : d.toLocaleDateString([], {month:'short',day:'numeric'});
}
function priorityFor(message) { return state.analyses[message.id]?.importance || (message.important ? 'high' : 'low'); }
function render() {
  const list = $('#mail-list');
  const remaining = state.messages.filter(m => !state.done.has(m.id));
  $('#nav-count').textContent = remaining.length;
  $('#total-count').textContent = state.messages.length;
  $('#done-count').textContent = state.done.size;
  $('#progress-fill').style.width = `${state.messages.length ? state.done.size / state.messages.length * 100 : 0}%`;
  const progressTrack=$('.progress-track');
  progressTrack.setAttribute('aria-valuemax',String(state.messages.length));
  progressTrack.setAttribute('aria-valuenow',String(state.done.size));
  progressTrack.setAttribute('aria-valuetext',`${state.done.size} of ${state.messages.length} messages reviewed`);
  $('#round-subtitle').textContent = `${remaining.length} unread message${remaining.length === 1 ? '' : 's'} · roughly ${Math.max(1, Math.ceil(remaining.length * .35))} min`;
  $('#mode-pill').innerHTML = `<span class="pulse-dot"></span> ${state.mode === 'gmail' ? 'Gmail connected' : 'Sample inbox'}`;
  $('#connect-label').textContent = state.connected ? 'Disconnect Gmail' : 'Connect Gmail';
  $('#account-status').textContent = state.connected ? (state.account || 'Gmail connected') : 'Demo workspace';
  const accountName=state.connected&&state.account?state.account.split('@')[0].replace(/[._-]+/g,' '):'Demo player';
  $('#profile-name').textContent=accountName.replace(/\b\w/g,char=>char.toUpperCase());
  $('#profile-avatar').textContent=accountName.trim().slice(0,1).toUpperCase()||'D';
  $('#start-label').textContent = state.messages.length && state.done.size === state.messages.length ? 'Sprint complete' : state.started ? 'Sprint in progress' : 'Start your sprint';
  $('#start-button').disabled = state.messages.length > 0 && state.done.size === state.messages.length;
  if (!state.messages.length) { list.innerHTML = '<div class="empty-state">Your unread inbox is clear. Nice work.</div>'; renderStats(); renderRecentActions(); return; }
  list.innerHTML = state.messages.map((m,i) => {
    const analysis = state.analyses[m.id], done = state.done.get(m.id), priority = priorityFor(m);
    const summary = analysis?.summary || '', reason = analysis?.reason || '';
    return `<article class="mail-card ${done ? 'is-done' : ''} ${state.selected === m.id ? 'selected' : ''}" data-id="${escapeHtml(m.id)}">
      <span class="mail-avatar ${avatarClasses[i % avatarClasses.length]}">${escapeHtml(m.avatar || m.sender?.slice(0,1) || '?')}</span>
      <div class="mail-main"><div class="mail-person-row"><span class="mail-sender">${escapeHtml(m.sender)}</span><span class="mail-address">${escapeHtml(m.email || '')}</span><time class="mail-time">${escapeHtml(formatDate(m.date))}</time></div>
      <button class="mail-subject" type="button" aria-pressed="${state.selected === m.id}" aria-label="Review email from ${escapeHtml(m.sender)}: ${escapeHtml(m.subject)}">${escapeHtml(m.subject)}</button><div class="mail-snippet">${escapeHtml(m.snippet || '')}</div>
      <div class="mail-flags">${state.started && analysis ? `<span class="priority-tag ${priority}"><i class="small-dot"></i>${priority[0].toUpperCase()+priority.slice(1)} priority</span>` : ''}${m.important ? '<span class="type-tag">Important</span>' : ''}${done ? `<span class="type-tag">${done === 'keep' ? 'Kept' : done === 'trash' ? 'In trash' : 'Archived'}</span>` : ''}</div>
      ${state.started && analysis ? `<div class="mail-ai"><span class="mini-spark">✳</span><p>${escapeHtml(summary)}</p><small>${escapeHtml(reason)}</small></div>` : ''}</div>
      <div class="mail-actions" aria-label="Email actions">${done ? `<button class="mail-action" data-action="undo" title="Undo action" aria-label="Undo action">↶</button>` : `<button class="mail-action keep" data-action="keep" title="Keep and mark reviewed" aria-label="Keep and mark reviewed">${icons.keep}</button><button class="mail-action archive" data-action="archive" title="Archive" aria-label="Archive">${icons.archive}</button><button class="mail-action trash" data-action="trash" title="Move to trash" aria-label="Move to trash">${icons.trash}</button>`}</div>
    </article>`;
  }).join('');
  if(state.started && state.done.size===0 && !state.cardsAnimated) { state.cardsAnimated=true; animateTo($$('.mail-card'),{duration:430,delay:anime?.stagger?anime.stagger(36):36}); }
  $$('.mail-card').forEach(card => {
    card.addEventListener('click', e => { if (e.target.closest('[data-action]')) return; selectMessage(card.dataset.id,{openDetails:true}); });
  });
  $$('[data-action]',list).forEach(button => button.addEventListener('click', e => { e.stopPropagation(); handleAction(button.closest('.mail-card').dataset.id,button.dataset.action); }));
  renderStats();
  renderRecentActions();
}
function renderRecentActions() {
  const panel=$('#recent-actions'), actions=state.history.filter(action=>!action.undone).slice(0,3);
  panel.hidden=state.started||actions.length===0;
  if(panel.hidden)return;
  panel.innerHTML=`<div class="recent-heading"><span>RECENTLY REVIEWED</span><small>Undo stays available after reload</small></div>${actions.map(action=>`<div class="recent-row"><div><strong>${escapeHtml(action.subject||'Recently handled email')}</strong><small>${escapeHtml(action.sender||'Gmail')} · ${action.action==='keep'?'Marked read':action.action==='archive'?'Archived':'Moved to Trash'}</small></div><button type="button" data-history-undo="${escapeHtml(action.messageId)}">Undo</button></div>`).join('')}`;
  $$('[data-history-undo]',panel).forEach(button=>button.addEventListener('click',()=>undoHistory(button.dataset.historyUndo)));
}
function renderStats() {
  $('#points-value').textContent = state.score;
  $('#accuracy-value').textContent = state.decisions ? `${Math.round(state.correct/state.decisions*100)}%` : '—';
  const done = state.messages.length > 0 && state.done.size === state.messages.length;
  if (done) { $('#start-label').textContent = state.started?'Sprint complete':'Inbox cleared'; $('#ai-status').textContent = 'COMPLETE'; if(state.started)recordCompletedSprint(); }
}
function renderMessageDetail(message, analysis) {
  $('#detail-avatar').textContent=message.avatar || message.sender?.slice(0,1) || '?';
  $('#detail-sender').textContent=message.sender || 'Unknown sender';
  $('#detail-email').textContent=message.email || '';
  $('#detail-date').textContent=formatDate(message.date) || '';
  $('#detail-subject').textContent=message.subject || '(no subject)';
  $('#detail-body').textContent=message.body || message.snippet || 'No message body is available.';
  const handled=state.done.has(message.id);
  $$('[data-detail-action]').forEach(button=>{button.disabled=handled;button.setAttribute('aria-disabled',String(handled));});
  const review=$('#detail-ai-review');
  if (!analysis) {
    review.innerHTML='<div class="detail-ai-empty"><span>✳</span><strong>AI review is waiting</strong><p>Start your sprint to get a priority, a short explanation, and a suggested next step for this message.</p></div>';
    return;
  }
  const priority=escapeHtml(analysis.importance || 'medium');
  review.innerHTML=`<div class="detail-review-content"><div class="detail-priority-row"><span>PRIORITY</span><span class="priority-tag ${priority}"><i class="small-dot"></i>${priority.toUpperCase()}</span></div><div class="detail-review-block"><small>QUICK SUMMARY</small><p>${escapeHtml(analysis.summary || 'No summary available.')}</p></div><div class="detail-review-block"><small>WHY IT MATTERS</small><p>${escapeHtml(analysis.reason || 'No additional context available.')}</p></div><div class="detail-next-step"><span>✳</span><div><small>SUGGESTED NEXT STEP</small><strong>${analysis.suggestedAction==='archive'?'Archive':'Keep in inbox'}</strong></div></div></div>`;
}
async function requestMessageReview(message) {
  if (state.analyses[message.id]) return;
  if (reviewRequests.has(message.id)) return reviewRequests.get(message.id);
  $('#ai-status').textContent='READING';
  $('#detail-ai-review').innerHTML='<div class="detail-ai-loading"><span class="ai-scanline"></span><strong>Reading with LM Studio</strong><p>Checking priority, context, and a safe next step…</p></div>';
  const request=reviewQueue.then(async()=>{
    try {
      const result=await api('/api/triage',{method:'POST',body:JSON.stringify({messages:[message],model:state.aiModel || undefined})});
      const analysis=result.analyses?.[message.id];
      if(!analysis)throw new Error('The model returned no review for this message.');
      state.analyses[message.id]=analysis;
      if(state.selected===message.id){
        renderMessageDetail(message,analysis);
        $('#ai-status').textContent=result.source==='lmstudio'?'LM STUDIO':result.source==='demo'?'LOCAL RULES':'ANALYZED';
      }
      if(result.notice)toast(result.notice,result.source==='demo'?'error':'');
    } catch(error) {
      if(state.selected===message.id){
        $('#ai-status').textContent='OFFLINE';
        $('#detail-ai-review').innerHTML=`<div class="detail-ai-empty detail-ai-error"><span>!</span><strong>AI model didn’t respond</strong><p>${escapeHtml(error.message)} Check the active provider, then click this email again.</p></div>`;
      }
    } finally { reviewRequests.delete(message.id); }
  });
  reviewQueue=request.catch(()=>{});
  reviewRequests.set(message.id,request);
  return request;
}
function selectMessage(id, {openDetails=false} = {}) {
  const previous=state.selected;
  state.selected = id;
  const message = state.messages.find(m => m.id === id), analysis = state.analyses[id];
  if (!message) return;
  if(state.started) awardXP('read',id,5);
  if(previous && previous!==id){const previousCard=$(`.mail-card[data-id="${CSS.escape(previous)}"]`);previousCard?.classList.remove('selected');previousCard?.querySelector('.mail-subject')?.setAttribute('aria-pressed','false');}
  const selectedCard=$(`.mail-card[data-id="${CSS.escape(id)}"]`);selectedCard?.classList.add('selected');selectedCard?.querySelector('.mail-subject')?.setAttribute('aria-pressed','true');
  renderMessageDetail(message,analysis);
  const detailDialog=$('#mail-detail-dialog');
  if(openDetails && !detailDialog.open) detailDialog.showModal();
  if(openDetails && !analysis) void requestMessageReview(message);
  if(detailDialog.open) { $('#detail-close').focus({preventScroll:true}); return; }
  const subjectButton=$(`.mail-card[data-id="${CSS.escape(id)}"] .mail-subject`);
  subjectButton?.focus({preventScroll:true});
  subjectButton?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
async function startSprint() {
  if (!state.started && state.connected && state.provider === 'openrouter' && sessionStorage.getItem('inboxsprint_openrouter_consent') !== 'v1') {
    $('#external-consent-check').checked = false; $('#consent-confirm').disabled = true; openDialog('#external-consent-dialog'); return;
  }
  await beginSprint();
}
async function beginSprint() {
  if (state.started || !state.messages.length) return;
  const button = $('#start-button'); button.disabled = true; $('#start-label').textContent = 'Reading your inbox…'; $('#ai-status').textContent='THINKING';
  try {
    if(reviewRequests.size)await Promise.allSettled([...reviewRequests.values()]);
    const unanalyzed=state.messages.filter(message=>!state.analyses[message.id]);
    let result={source:state.provider};
    if(unanalyzed.length){result=await api('/api/triage',{method:'POST',body:JSON.stringify({messages:unanalyzed,model:state.aiModel || undefined,aiConsent:sessionStorage.getItem('inboxsprint_openrouter_consent')==='v1'})});state.analyses={...state.analyses,...(result.analyses||{})};}
    state.seconds = 180;
    if (result.notice) toast(result.notice);
    $('#ai-status').textContent = result.source === 'lmstudio' ? 'LM STUDIO' : result.source === 'demo' ? 'LOCAL RULES' : 'ANALYZED';
    await showCountdown(); state.started=true; state.cardsAnimated=true; state.timer = setInterval(tick,1000); render();
    if (state.messages[0]) selectMessage(state.messages.find(m => !state.done.has(m.id))?.id || state.messages[0].id);
    animateTo($$('.mail-card'),{duration:430,delay:anime?.stagger?anime.stagger(36):36});
    animateTo('.focus-card',{duration:400,opacity:[0,1],translateY:[16,0],scale:[.94,1]});
  } catch (error) { $('#ai-status').textContent='READY'; toast(error.message,'error'); }
  finally { button.disabled = false; }
}
function tick() {
  if (state.seconds > 0) state.seconds--;
  const m = String(Math.floor(state.seconds/60)).padStart(2,'0'), s = String(state.seconds%60).padStart(2,'0');
  $('#timer-text').textContent = `${m}:${s}`;
  $('#timer-progress').style.strokeDashoffset = String(333 * (1 - state.seconds / 180));
  if (state.seconds <= 20) $('#timer-progress').style.stroke = '#dc5963';
  if(state.seconds===20) { $('.timer-ring').classList.add('timer-danger'); toast('Final 20 seconds! Keep your streak alive.'); }
  if (state.seconds <= 0) { clearInterval(state.timer); state.timer = null; toast('Time is up — finish the remaining messages at your own pace.',''); }
}
function handleAction(id, action) {
  if (action === 'undo') return undoAction(id);
  const message = state.messages.find(m => m.id === id);
  if (!message || state.done.has(id)) return;
  state.pending = {message,action};
  $('#dialog-mark').className = `dialog-mark ${action === 'trash' ? 'trash' : action === 'keep' ? 'keep' : ''}`;
  $('#dialog-kicker').textContent = action === 'trash' ? 'ONE LAST CHECK' : action === 'keep' ? 'KEEP IN INBOX' : 'QUICK CHECK';
  $('#dialog-title').textContent = action === 'trash' ? 'Move this to Trash?' : action === 'keep' ? 'Keep it and mark it read?' : 'Archive this message?';
  $('#dialog-copy').textContent = action === 'trash' ? 'It will move to Gmail Trash. You can restore it before it is permanently deleted.' : action === 'keep' ? 'It stays in your inbox and leaves the unread pile. You can undo this and mark it unread again.' : 'It’ll leave your inbox, but you can bring it back anytime.';
  $('#dialog-message').innerHTML = `<strong>${escapeHtml(message.subject)}</strong><small>${escapeHtml(message.sender)} · ${escapeHtml(message.email || '')}</small>`;
  $('#dialog-confirm').innerHTML = `${action === 'trash' ? 'Move to Trash' : action === 'keep' ? 'Keep and mark read' : 'Yes, archive it'} <span class="button-arrow">→</span>`;
  $('#action-dialog').showModal();
  $('#action-dialog .secondary-button')?.focus();
}
async function confirmPending() {
  if (!state.pending) return;
  const {message,action} = state.pending;
  if ($('#action-dialog').open) $('#action-dialog').close(); state.pending = null;
  await applyAction(message,action);
}
async function applyAction(message,action) {
  const button = $(`.mail-card[data-id="${CSS.escape(message.id)}"] [data-action="${action}"]`);
  if (button) button.disabled = true;
  try {
    const result=await api('/api/action',{method:'POST',body:JSON.stringify({messageId:message.id,action})});
    const card=$(`.mail-card[data-id="${CSS.escape(message.id)}"]`);
    if(card && !reducedMotion) {
      try {
        if(anime?.animate) await new Promise(resolve=>anime.animate(card,{translateX:action==='trash'?180:action==='keep'?-120:0,translateY:action==='archive'?90:0,rotate:action==='trash'?8:action==='keep'?-5:0,scale:.78,opacity:0,duration:250,ease:'in(3)',onComplete:resolve}));
        else await card.animate([{transform:'scale(1)',opacity:1},{transform:'translateY(36px) scale(.86)',opacity:0}],{duration:220,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
      } catch (motionError) { console.warn('Action animation skipped:',motionError); }
    }
    const suggestion = state.analyses[message.id]?.suggestedAction;
    awardXP('actions',message.id,10);
    if(state.started){
      const correct = action === 'keep' ? suggestion !== 'archive' : action === 'archive' ? suggestion === 'archive' : false;
      const points = action === 'keep' && suggestion === 'keep' || action === 'archive' && suggestion === 'archive' ? 10 : action === 'trash' ? 3 : 5;
      state.decisions++; if (correct) state.correct++;
      state.score += points; state.pointsById.set(message.id,points); state.correctById.set(message.id,correct);
      const scoreCard=$('.score-card'); scoreCard.classList.remove('score-pop'); void scoreCard.offsetWidth; scoreCard.classList.add('score-pop');
    }
    state.done.set(message.id,action);
    render();
    if(state.selected===message.id)renderMessageDetail(message,state.analyses[message.id]);
    toast(result.warning || (action === 'keep' ? 'Marked as read and kept in your inbox.' : action === 'archive' ? 'Archived. One less thing in your inbox.' : 'Moved to Trash.'),result.warning ? '' : 'success');
    if (state.done.size === state.messages.length && state.started) { if (state.timer) clearInterval(state.timer); state.timer=null; $('#ai-status').textContent='COMPLETE'; recordCompletedSprint(); $('#overlay-kicker').textContent='ROUND CLEARED'; $('#overlay-count').textContent='✦'; $('#overlay-caption').textContent=`${state.score} points · inbox reset`; $('#game-overlay').classList.add('active','victory'); $('#game-overlay').setAttribute('aria-hidden','false'); burstConfetti(); setTimeout(()=>{$('#game-overlay').classList.remove('active','victory');$('#game-overlay').setAttribute('aria-hidden','true');},1900); }
    if (state.selected === message.id) { const next=state.messages.find(m=>!state.done.has(m.id)); if (next) selectMessage(next.id); }
  } catch(error) { toast(error.message,'error'); if(button) button.disabled=false; }
}
async function undoAction(id) {
  const action=state.done.get(id); if (!action) return;
  try { const result=await api('/api/undo',{method:'POST',body:JSON.stringify({messageId:id})}); state.done.delete(id); state.decisions=Math.max(0,state.decisions-1); state.score=Math.max(0,state.score-(state.pointsById.get(id)||0)); if(state.correctById.get(id))state.correct=Math.max(0,state.correct-1);state.pointsById.delete(id);state.correctById.delete(id);state.selected=id;render();$(`.mail-card[data-id="${CSS.escape(id)}"] .mail-subject`)?.focus({preventScroll:true}); toast(result.warning || 'Action undone. Message back in your round.',result.warning ? '' : 'success'); }
  catch(error) { toast(error.message,'error'); }
}
async function undoHistory(id) {
  try {
    const result=await api('/api/undo',{method:'POST',body:JSON.stringify({messageId:id})});
    state.history=state.history.filter(action=>action.messageId!==id);
    toast(result.warning || 'Action undone. The email is back in your inbox.','success');
    await loadInbox();
    if(state.messages.some(message=>message.id===id))selectMessage(id);
  } catch(error) { toast(error.message,'error'); }
}
async function loadInbox() {
  $('#mail-list').innerHTML='<div class="loading-state">Getting your inbox ready…</div>';
  try {
    const config=await api('/api/config'); state.connected=config.connected; state.account=config.account; state.configured=config.gmailConfigured; state.provider=config.providerConfig.provider; state.lmStudioBaseUrl=config.providerConfig.lmStudioBaseUrl; let savedModel=null; try{savedModel=localStorage.getItem('inboxSprintAIModel');}catch{} state.aiModel=savedModel && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,179}$/.test(savedModel)?savedModel:config.providerConfig.model;
    const result=await api('/api/messages'); const progress=await api('/api/progress'); state.history=progress.actions||[]; state.messages=result.messages || []; state.mode=result.mode || 'demo'; state.analyses={}; state.done.clear(); state.pointsById.clear(); state.correctById.clear(); state.started=false; state.cardsAnimated=false; state.score=0; state.correct=0; state.decisions=0; state.selected=null;
    if (state.timer) clearInterval(state.timer); state.timer=null; state.seconds=180; $('.timer-ring').classList.remove('timer-danger'); $('#timer-text').textContent='03:00'; $('#timer-progress').style.strokeDashoffset='0'; $('#timer-progress').style.stroke='#00d2ff'; $('#ai-status').textContent='READY';
    render();
  } catch(error) { $('#mail-list').innerHTML=`<div class="empty-state">${escapeHtml(error.message)} <button id="retry-load">Try again</button></div>`; $('#retry-load')?.addEventListener('click',loadInbox); }
}
function openDialog(id) { $(id).showModal(); }
async function refreshAIModelList() {
  const status=$('#ai-model-state'); status.textContent='Checking LM Studio…';
  try {
    const result=await api('/api/ai/models'), list=$('#installed-ai-models');
    list.replaceChildren(...(result.models||[]).map(model=>{const option=document.createElement('option');option.value=model;return option;}));
    status.textContent=result.available?`${result.models.length} installed model${result.models.length===1?'':'s'} found`:'Model list unavailable · enter an ID';
  } catch { status.textContent='Could not load models · enter an ID'; }
}
$('#start-button').addEventListener('click',startSprint);
$('#refresh-button').addEventListener('click',loadInbox);
$('#reset-round').addEventListener('click',loadInbox);
$('#help-button').addEventListener('click',()=>openDialog('#help-dialog'));
$('#ai-settings').addEventListener('click',async()=>{$('#mail-detail-dialog').close();try{const c=await api('/api/config'),p=c.providerConfig,localActive=p.provider==='lmstudio';$('#openrouter-state').textContent=localActive?'Standby — LM Studio is selected':p.openrouterReady?'API key configured':'No API key configured — smart demo scoring is active';$('#provider-badge').textContent=localActive?'STANDBY':p.provider.toUpperCase();$('#lmstudio-state').textContent=localActive?`Selected: ${state.aiModel||p.model} · ${p.lmStudioBaseUrl}`:'Available for local development';$('#lmstudio-badge').textContent=localActive?'ACTIVE':'LOCAL';$('#ai-model-input').value=state.aiModel||p.model;}catch{$('#openrouter-state').textContent='Connection status unavailable';$('#lmstudio-state').textContent='Connection status unavailable';$('#ai-model-input').value=state.aiModel||'';}openDialog('#settings-dialog');void refreshAIModelList();});
$('#refresh-ai-models').addEventListener('click',refreshAIModelList);
$('#ai-model-input').addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
$('#save-ai-model').addEventListener('click',()=>{const model=$('#ai-model-input').value.trim();if(!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,179}$/.test(model)){toast('Enter a valid model ID.','error');return;}state.aiModel=model;try{localStorage.setItem('inboxSprintAIModel',model);}catch{}state.analyses={};reviewRequests.clear();$('#ai-model-state').textContent='Saved in this browser';if(state.provider==='lmstudio')$('#lmstudio-state').textContent=`Selected: ${model} · ${state.lmStudioBaseUrl}`;$('#ai-status').textContent='MODEL SET';toast(`AI model set to ${model}. New email reviews will use it.`,'success');});
$('#detail-close').addEventListener('click',()=>$('#mail-detail-dialog').close());
$('#mail-detail-dialog').addEventListener('close',()=>{const id=state.selected;if(id)$(`.mail-card[data-id="${CSS.escape(id)}"] .mail-subject`)?.focus({preventScroll:true});});
$$('[data-detail-action]').forEach(button=>button.addEventListener('click',()=>{if(state.selected)handleAction(state.selected,button.dataset.detailAction);}));
$('#action-dialog').addEventListener('close',()=>{if($('#action-dialog').returnValue==='confirm')confirmPending();else state.pending=null;});
$('#external-consent-check').addEventListener('change',e=>{$('#consent-confirm').disabled=!e.target.checked;});
$('#external-consent-dialog').addEventListener('close',()=>{if($('#external-consent-dialog').returnValue==='consent'&&$('#external-consent-check').checked){sessionStorage.setItem('inboxsprint_openrouter_consent','v1');beginSprint();}});
$('#connect-button').addEventListener('click',async()=>{
  if(state.connected){if(!confirm('Disconnect Gmail and remove this app’s saved session?'))return;try{const result=await api('/api/disconnect',{method:'POST',body:'{}'});toast(result.cleanupWarning || 'Gmail disconnected.','success');await loadInbox();}catch(error){toast(error.message,'error');}return;}
  if(!state.configured){toast('Gmail OAuth is not configured yet. You can keep playing in sample mode.');return;}
  location.href='/auth/google';
});
$('#profile-button').addEventListener('click',()=>state.connected?toast(`Connected as ${state.account || 'your Gmail account'}. Use “Disconnect Gmail” to remove access.`):toast('Sample inbox is not connected to an email account.'));
$('#round-menu').addEventListener('click',()=>toast('Your three-minute round begins when you start.'));
$$('[data-nav="insights"]').forEach(button=>button.addEventListener('click',()=>toast('Insights will be available after your first sprint.')));
const params=new URLSearchParams(location.search);
if(params.get('connect')==='unavailable')toast('Gmail sign-in isn’t configured yet. Sample mode is ready.');
if(params.get('connect')==='failed')toast('Google sign-in didn’t complete. Try again or keep using sample mode.','error');
if(params.get('connected')==='1')toast('Gmail connected. Let’s find the signal.','success');
if(params.has('connect')||params.has('connected'))history.replaceState({},'',location.pathname);
window.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const actionDialog = $('#action-dialog');
  if (actionDialog?.open) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      confirmPending();
    }
    return;
  }
  const dialogs = $$('dialog').some(d => d.open);
  if (dialogs) return;

  const currentId = state.selected;
  const currentIndex = state.messages.findIndex(m => m.id === currentId);

  if (e.key === 'j' || e.key === 'ArrowDown') {
    e.preventDefault();
    const open=state.messages.filter(m=>!state.done.has(m.id));
    const next=open.find(m=>state.messages.indexOf(m)>currentIndex)||open[0];
    if(next)selectMessage(next.id);
  } else if (e.key === 'k' || e.key === 'ArrowUp') {
    e.preventDefault();
    const open=state.messages.filter(m=>!state.done.has(m.id));
    const prev=[...open].reverse().find(m=>state.messages.indexOf(m)<currentIndex)||open.at(-1);
    if(prev)selectMessage(prev.id);
  } else if (e.key === 'e' || e.key === 'a') {
    if (currentId) { e.preventDefault(); handleAction(currentId, 'archive'); }
  } else if (e.key === 't' || e.key === '#' || e.key === 'Delete') {
    if (currentId) { e.preventDefault(); handleAction(currentId, 'trash'); }
  } else if (e.key === 'w' || e.key === 's') {
    if (currentId) { e.preventDefault(); handleAction(currentId, 'keep'); }
  } else if (e.key === 'z' || e.key === 'u') {
    const lastDone = [...state.done.keys()].pop();
    if (lastDone) { e.preventDefault(); undoAction(lastDone); }
  }
});

renderStreak();
renderPlayerLevel();
loadInbox();
