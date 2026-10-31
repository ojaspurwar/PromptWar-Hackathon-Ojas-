const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { messages:[], analyses:{}, mode:'demo', connected:false, account:null, configured:false, started:false, seconds:180, timer:null, selected:null, done:new Map(), pointsById:new Map(), correctById:new Map(), score:0, correct:0, decisions:0, pending:null, provider:'openrouter', notice:null };
const avatarClasses = ['','violet','mint','peach','blue','gold','rose'];
const icons = {
  archive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM3 4h18v3H3zm6 7h6"/></svg>',
  trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  keep:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
};
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
  $('#round-subtitle').textContent = `${remaining.length} unread message${remaining.length === 1 ? '' : 's'} · roughly ${Math.max(1, Math.ceil(remaining.length * .35))} min`;
  $('#mode-pill').innerHTML = `<span class="pulse-dot"></span> ${state.mode === 'gmail' ? 'Gmail connected' : 'Sample inbox'}`;
  $('#connect-label').textContent = state.connected ? 'Disconnect Gmail' : 'Connect Gmail';
  $('#account-status').textContent = state.connected ? (state.account || 'Gmail connected') : 'Demo workspace';
  $('#start-label').textContent = state.messages.length && state.done.size === state.messages.length ? 'Sprint complete' : state.started ? 'Sprint in progress' : 'Start your sprint';
  $('#start-button').disabled = state.messages.length > 0 && state.done.size === state.messages.length;
  if (!state.messages.length) { list.innerHTML = '<div class="empty-state">Your unread inbox is clear. Nice work.</div>'; renderStats(); return; }
  list.innerHTML = state.messages.map((m,i) => {
    const analysis = state.analyses[m.id], done = state.done.get(m.id), priority = priorityFor(m);
    const summary = analysis?.summary || '', reason = analysis?.reason || '';
    return `<article class="mail-card ${done ? 'is-done' : ''} ${state.selected === m.id ? 'selected' : ''}" data-id="${escapeHtml(m.id)}" tabindex="0" role="button" aria-label="Review email from ${escapeHtml(m.sender)}: ${escapeHtml(m.subject)}">
      <span class="mail-avatar ${avatarClasses[i % avatarClasses.length]}">${escapeHtml(m.avatar || m.sender?.slice(0,1) || '?')}</span>
      <div class="mail-main"><div class="mail-person-row"><span class="mail-sender">${escapeHtml(m.sender)}</span><span class="mail-address">${escapeHtml(m.email || '')}</span><time class="mail-time">${escapeHtml(formatDate(m.date))}</time></div>
      <div class="mail-subject">${escapeHtml(m.subject)}</div><div class="mail-snippet">${escapeHtml(m.snippet || '')}</div>
      <div class="mail-flags">${state.started && analysis ? `<span class="priority-tag ${priority}"><i class="small-dot"></i>${priority[0].toUpperCase()+priority.slice(1)} priority</span>` : ''}${m.important ? '<span class="type-tag">Important</span>' : ''}${done ? `<span class="type-tag">${done === 'keep' ? 'Kept' : done === 'trash' ? 'In trash' : 'Archived'}</span>` : ''}</div>
      ${state.started && analysis ? `<div class="mail-ai"><span class="mini-spark">✳</span><p>${escapeHtml(summary)}</p><small>${escapeHtml(reason)}</small></div>` : ''}</div>
      <div class="mail-actions" aria-label="Email actions">${done ? `<button class="mail-action" data-action="undo" title="Undo action" aria-label="Undo action">↶</button>` : `<button class="mail-action keep" data-action="keep" title="Keep and mark reviewed" aria-label="Keep and mark reviewed">${icons.keep}</button><button class="mail-action archive" data-action="archive" title="Archive" aria-label="Archive">${icons.archive}</button><button class="mail-action trash" data-action="trash" title="Move to trash" aria-label="Move to trash">${icons.trash}</button>`}</div>
    </article>`;
  }).join('');
  $$('.mail-card').forEach(card => {
    card.addEventListener('click', e => { if (e.target.closest('[data-action]')) return; selectMessage(card.dataset.id); });
    card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('[data-action]')) { e.preventDefault(); selectMessage(card.dataset.id); } });
  });
  $$('[data-action]',list).forEach(button => button.addEventListener('click', e => { e.stopPropagation(); handleAction(button.closest('.mail-card').dataset.id,button.dataset.action); }));
  renderStats();
}
function renderStats() {
  $('#points-value').textContent = state.score;
  $('#accuracy-value').textContent = state.decisions ? `${Math.round(state.correct/state.decisions*100)}%` : '—';
  const done = state.messages.length > 0 && state.done.size === state.messages.length;
  if (done) { $('#start-label').textContent = 'Sprint complete'; $('#ai-status').textContent = 'COMPLETE'; }
}
function selectMessage(id) {
  state.selected = id;
  const message = state.messages.find(m => m.id === id), analysis = state.analyses[id];
  if (!message) return;
  render();
  if (!analysis) { $('#ai-summary').innerHTML = `<div class="summary-content"><div class="summary-head"><span>MESSAGE PREVIEW</span><span>${escapeHtml(message.email || '')}</span></div><strong>${escapeHtml(message.subject)}</strong><p>${escapeHtml(message.snippet || message.body || '')}</p></div>`; return; }
  $('#ai-summary').innerHTML = `<div class="summary-content"><div class="summary-head"><span>MESSAGE SUMMARY</span><span class="priority-tag ${analysis.importance}"><i class="small-dot"></i>${escapeHtml(analysis.importance.toUpperCase())}</span></div><strong>${escapeHtml(message.subject)}</strong><p>${escapeHtml(analysis.summary)}</p><p><b>Why:</b> ${escapeHtml(analysis.reason)}</p><div class="summary-head"><span>AI SUGGESTS</span><b>${analysis.suggestedAction === 'archive' ? 'Archive' : 'Keep'}</b></div></div>`;
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
    const result = await api('/api/triage',{method:'POST',body:JSON.stringify({messages:state.messages,aiConsent:sessionStorage.getItem('inboxsprint_openrouter_consent')==='v1'})});
    state.analyses = result.analyses || {}; state.started = true; state.seconds = 180;
    if (result.notice) toast(result.notice);
    $('#ai-status').textContent = result.source === 'demo' ? 'SMART MODE' : 'ANALYZED';
    state.timer = setInterval(tick,1000); render();
    if (state.messages[0]) selectMessage(state.messages.find(m => !state.done.has(m.id))?.id || state.messages[0].id);
  } catch (error) { $('#ai-status').textContent='READY'; toast(error.message,'error'); }
  finally { button.disabled = false; }
}
function tick() {
  if (state.seconds > 0) state.seconds--;
  const m = String(Math.floor(state.seconds/60)).padStart(2,'0'), s = String(state.seconds%60).padStart(2,'0');
  $('#timer-text').textContent = `${m}:${s}`;
  $('#timer-progress').style.strokeDashoffset = String(333 * (1 - state.seconds / 180));
  if (state.seconds <= 20) $('#timer-progress').style.stroke = '#dc5963';
  if (state.seconds <= 0) { clearInterval(state.timer); state.timer = null; toast('Time’s up — your progress is saved.',''); }
}
function handleAction(id, action) {
  if (!state.started) { toast('Start your sprint to review AI summaries before choosing an action.'); return; }
  if (action === 'undo') return undoAction(id);
  const message = state.messages.find(m => m.id === id);
  if (!message || state.done.has(id)) return;
  if (action === 'keep') { applyAction(message,'keep'); return; }
  state.pending = {message,action};
  $('#dialog-mark').className = `dialog-mark ${action === 'trash' ? 'trash' : ''}`;
  $('#dialog-kicker').textContent = action === 'trash' ? 'ONE LAST CHECK' : 'QUICK CHECK';
  $('#dialog-title').textContent = action === 'trash' ? 'Move this to Trash?' : 'Archive this message?';
  $('#dialog-copy').textContent = action === 'trash' ? 'It will move to Gmail Trash. You can restore it before it is permanently deleted.' : 'It’ll leave your inbox, but you can bring it back anytime.';
  $('#dialog-message').innerHTML = `<strong>${escapeHtml(message.subject)}</strong><small>${escapeHtml(message.sender)} · ${escapeHtml(message.email || '')}</small>`;
  $('#dialog-confirm').innerHTML = `${action === 'trash' ? 'Move to Trash' : 'Yes, archive it'} <span class="button-arrow">→</span>`;
  $('#action-dialog').showModal();
}
async function confirmPending() {
  if (!state.pending) return;
  const {message,action} = state.pending;
  $('#action-dialog').close(); state.pending = null;
  await applyAction(message,action);
}
async function applyAction(message,action) {
  const button = $(`.mail-card[data-id="${CSS.escape(message.id)}"] [data-action="${action}"]`);
  if (button) button.disabled = true;
  try {
    await api('/api/action',{method:'POST',body:JSON.stringify({messageId:message.id,action})});
    const suggestion = state.analyses[message.id]?.suggestedAction;
    const correct = action === 'keep' ? suggestion !== 'archive' : action === 'archive' ? suggestion === 'archive' : false;
    const points = action === 'keep' && suggestion === 'keep' || action === 'archive' && suggestion === 'archive' ? 10 : action === 'trash' ? 3 : 5;
    state.decisions++; if (correct) state.correct++;
    state.score += points; state.pointsById.set(message.id,points); state.correctById.set(message.id,correct);
    state.done.set(message.id,action);
    render();
    toast(action === 'keep' ? 'Kept in your inbox — nice call.' : action === 'archive' ? 'Archived. One less thing in your inbox.' : 'Moved to Trash.','success');
    if (state.done.size === state.messages.length) { if (state.timer) clearInterval(state.timer); state.timer=null; $('#ai-status').textContent='COMPLETE'; $('#ai-summary').innerHTML='<div class="summary-placeholder"><span class="placeholder-icon">✦</span><p>Inbox reset complete. You cleared the noise and kept the signal.</p></div>'; }
    if (state.selected === message.id) { const next=state.messages.find(m=>!state.done.has(m.id)); if (next) selectMessage(next.id); }
  } catch(error) { toast(error.message,'error'); if(button) button.disabled=false; }
}
async function undoAction(id) {
  const action=state.done.get(id); if (!action) return;
  try { await api('/api/undo',{method:'POST',body:JSON.stringify({messageId:id})}); state.done.delete(id); state.decisions=Math.max(0,state.decisions-1); state.score=Math.max(0,state.score-(state.pointsById.get(id)||0)); if(state.correctById.get(id))state.correct=Math.max(0,state.correct-1);state.pointsById.delete(id);state.correctById.delete(id);render(); toast('Action undone. Message back in your round.','success'); }
  catch(error) { toast(error.message,'error'); }
}
async function loadInbox() {
  $('#mail-list').innerHTML='<div class="loading-state">Getting your inbox ready…</div>';
  try {
    const config=await api('/api/config'); state.connected=config.connected; state.account=config.account; state.configured=config.gmailConfigured; state.provider=config.providerConfig.provider;
    const result=await api('/api/messages'); state.messages=result.messages || []; state.mode=result.mode || 'demo'; state.analyses={}; state.done.clear(); state.pointsById.clear(); state.correctById.clear(); state.started=false; state.score=0; state.correct=0; state.decisions=0; state.selected=null;
    if (state.timer) clearInterval(state.timer); state.timer=null; state.seconds=180; $('#timer-text').textContent='03:00'; $('#timer-progress').style.strokeDashoffset='0'; $('#timer-progress').style.stroke='#586be4'; $('#ai-status').textContent='READY';
    render();
  } catch(error) { $('#mail-list').innerHTML=`<div class="empty-state">${escapeHtml(error.message)} <button id="retry-load">Try again</button></div>`; $('#retry-load')?.addEventListener('click',loadInbox); }
}
function openDialog(id) { $(id).showModal(); }
$('#start-button').addEventListener('click',startSprint);
$('#refresh-button').addEventListener('click',loadInbox);
$('#reset-round').addEventListener('click',loadInbox);
$('#help-button').addEventListener('click',()=>openDialog('#help-dialog'));
$('#ai-settings').addEventListener('click',async()=>{try{const c=await api('/api/config');$('#openrouter-state').textContent=c.providerConfig.openrouterReady?'Connected and ready':'No API key configured — smart demo scoring is active';$('#provider-badge').textContent=c.providerConfig.provider.toUpperCase();}catch{$('#openrouter-state').textContent='Connection status unavailable';}openDialog('#settings-dialog');});
$('#action-dialog').addEventListener('close',()=>{if($('#action-dialog').returnValue==='confirm')confirmPending();else state.pending=null;});
$('#external-consent-check').addEventListener('change',e=>{$('#consent-confirm').disabled=!e.target.checked;});
$('#external-consent-dialog').addEventListener('close',()=>{if($('#external-consent-dialog').returnValue==='consent'&&$('#external-consent-check').checked){sessionStorage.setItem('inboxsprint_openrouter_consent','v1');beginSprint();}});
$('#connect-button').addEventListener('click',async()=>{
  if(state.connected){if(!confirm('Disconnect Gmail and remove this app’s saved session?'))return;try{const result=await api('/api/disconnect',{method:'POST',body:'{}'});toast(result.cleanupWarning || 'Gmail disconnected.','success');await loadInbox();}catch(error){toast(error.message,'error');}return;}
  if(!state.configured){toast('Gmail OAuth is not configured yet. You can keep playing in sample mode.');return;}
  location.href='/auth/google';
});
$('#profile-button').addEventListener('click',()=>state.connected?toast(`Connected as ${state.account || 'your Gmail account'}. Use “Disconnect Gmail” to remove access.`):toast('You’re playing in a private sample workspace.'));
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
    if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
      e.preventDefault();
      confirmPending();
    }
    return;
  }
  const dialogs = $$('dialog').some(d => d.open);
  if (dialogs) return;

  const currentId = state.selected || state.messages.find(m => !state.done.has(m.id))?.id;
  const currentIndex = state.messages.findIndex(m => m.id === currentId);

  if (e.key === 'j' || e.key === 'ArrowDown') {
    e.preventDefault();
    const next = state.messages.slice(currentIndex + 1).find(m => !state.done.has(m.id)) || state.messages[currentIndex + 1];
    if (next) selectMessage(next.id);
  } else if (e.key === 'k' || e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = [...state.messages.slice(0, Math.max(0, currentIndex))].reverse().find(m => !state.done.has(m.id)) || state.messages[currentIndex - 1];
    if (prev) selectMessage(prev.id);
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

loadInbox();
