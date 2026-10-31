const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { server, parseCookies, sign, encrypt, decrypt, normalizeEmail, fallbackTriage, modelTriage, gmailActionOperation, loadLocalEnv, authorizationUrl } = require('../server.js');

let baseUrl;
let testServer;

test.before(async () => {
  await new Promise((resolve) => {
    testServer = server.listen(0, '127.0.0.1', () => {
      const addr = testServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(resolve));
});

test('GET /healthz returns service status', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.service, 'inbox-sprint');
});

test('GET / serves index.html with security headers', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  const text = await res.text();
  assert.match(text, /Inbox Sprint/);
});

test('Directory traversal is blocked', async () => {
  const res = await fetch(`${baseUrl}/../server.js`);
  assert.ok(res.status === 403 || res.status === 404);
});

test('GET /api/config returns configuration status', async () => {
  const res = await fetch(`${baseUrl}/api/config`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.gmailConfigured, 'boolean');
  assert.equal(typeof data.connected, 'boolean');
  assert.equal(typeof data.demoCount, 'number');
  assert.ok(data.demoCount > 0);
});

test('GET /api/messages returns demo messages in demo mode', async () => {
  const res = await fetch(`${baseUrl}/api/messages`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.mode, 'demo');
  assert.ok(Array.isArray(data.messages));
  assert.ok(data.messages.length > 0);
  assert.ok(data.messages[0].subject);
});

test('POST /api/triage scores messages', async () => {
  const oldProvider=process.env.AI_PROVIDER, oldKey=process.env.OPENROUTER_API_KEY;
  process.env.AI_PROVIDER='openrouter';
  delete process.env.OPENROUTER_API_KEY;
  try {
    const res = await fetch(`${baseUrl}/api/triage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ id: 'test-1', subject: 'Urgent contract approval', snippet: 'Decision needed today' }] })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.analyses);
    assert.ok(data.analyses['test-1']);
    assert.equal(data.analyses['test-1'].importance, 'high');
    assert.equal(data.analyses['test-1'].suggestedAction, 'keep');
  } finally {
    if(oldProvider===undefined)delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER=oldProvider;
    if(oldKey===undefined)delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY=oldKey;
  }
});

test('POST /api/action and /api/undo lifecycle', async () => {
  // 1. Perform action
  const actionRes = await fetch(`${baseUrl}/api/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messageId: 'm1', action: 'archive' })
  });
  assert.equal(actionRes.status, 200);
  const actionData = await actionRes.json();
  assert.equal(actionData.ok, true);
  assert.equal(actionData.action.action, 'archive');

  // Grab cookie for undo
  const cookie = actionRes.headers.get('set-cookie');
  assert.ok(cookie);

  // 2. Perform undo
  const undoRes = await fetch(`${baseUrl}/api/undo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ messageId: 'm1' })
  });
  assert.equal(undoRes.status, 200);
  const undoData = await undoRes.json();
  assert.equal(undoData.ok, true);

  // 3. Second undo fails
  const undoRes2 = await fetch(`${baseUrl}/api/undo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ messageId: 'm1' })
  });
  assert.equal(undoRes2.status, 404);
});

test('POST /api/action keeps a message available and records an undoable review', async () => {
  const actionRes = await fetch(`${baseUrl}/api/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messageId: 'm1', action: 'keep' })
  });
  assert.equal(actionRes.status, 200);
  assert.equal((await actionRes.json()).action.action, 'keep');
  const cookie = actionRes.headers.get('set-cookie');
  const progressRes = await fetch(`${baseUrl}/api/progress`, { headers:{cookie} });
  const progressData = await progressRes.json();
  assert.equal(progressData.actions[0].subject, 'Updated launch timeline — decision needed today');
  const undoRes = await fetch(`${baseUrl}/api/undo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ messageId: 'm1' })
  });
  assert.equal(undoRes.status, 200);
  const progressAfterUndo = await fetch(`${baseUrl}/api/progress`, { headers:{cookie} });
  assert.equal((await progressAfterUndo.json()).actions.length, 0);
});

test('Origin checking rejects cross-site mutations', async () => {
  const res = await fetch(`${baseUrl}/api/action`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'origin': 'https://evil-attacker.example.com'
    },
    body: JSON.stringify({ messageId: 'm1', action: 'trash' })
  });
  assert.equal(res.status, 403);
});

test('Unit: parseCookies handles standard and malformed cookies gracefully', () => {
  const parsed = parseCookies('foo=bar; session=abc%20123; malformed=%ff');
  assert.equal(parsed.foo, 'bar');
  assert.equal(parsed.session, 'abc 123');
  assert.equal(parsed.malformed, '%ff');
});

test('Unit: local env file loads values without overriding the process environment', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-sprint-env-'));
  const file = path.join(dir, '.env');
  const loadedKey = `INBOX_SPRINT_ENV_TEST_${process.pid}`;
  const existingKey = `${loadedKey}_EXISTING`;
  process.env[existingKey] = 'from-process';
  try {
    fs.writeFileSync(file, `${loadedKey}="local value"\n${existingKey}=from-file\n# ignored\n`);
    loadLocalEnv(file);
    assert.equal(process.env[loadedKey], 'local value');
    assert.equal(process.env[existingKey], 'from-process');
  } finally {
    delete process.env[loadedKey];
    delete process.env[existingKey];
    fs.rmSync(dir, { recursive:true, force:true });
  }
});

test('Unit: Gmail OAuth URL uses the configured callback, offline access, and Gmail modify scope', () => {
  const keys = ['GOOGLE_CLIENT_ID','GOOGLE_REDIRECT_URI','APP_BASE_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.GOOGLE_CLIENT_ID = 'oauth-client-test';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8080/auth/callback';
    process.env.APP_BASE_URL = 'http://localhost:8080';
    const url = new URL(authorizationUrl('state-test'));
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.pathname, '/o/oauth2/v2/auth');
    assert.equal(url.searchParams.get('client_id'), 'oauth-client-test');
    assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:8080/auth/callback');
    assert.equal(url.searchParams.get('access_type'), 'offline');
    assert.equal(url.searchParams.get('include_granted_scopes'), 'true');
    assert.ok(url.searchParams.get('scope').includes('https://www.googleapis.com/auth/gmail.modify'));
    assert.equal(url.searchParams.get('state'), 'state-test');
  } finally {
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});

test('Unit: sign and signature verification', () => {
  const id = 'test-session-id';
  const sig = sign(id);
  assert.ok(typeof sig === 'string');
  assert.equal(sig, sign(id));
});

test('Unit: normalizeEmail formats Gmail payload', () => {
  const raw = {
    id: 'msg-100',
    snippet: 'Hey there',
    labelIds: ['UNREAD', 'IMPORTANT'],
    payload: {
      headers: [
        { name: 'From', value: 'Alice Smith <alice@example.com>' },
        { name: 'Subject', value: 'Quarterly Review' },
        { name: 'Date', value: 'Wed, 28 Oct 2026 10:00:00 GMT' }
      ],
      body: { data: Buffer.from('Email body content here').toString('base64url') },
      mimeType: 'text/plain'
    }
  };
  const normalized = normalizeEmail(raw, 0);
  assert.equal(normalized.id, 'msg-100');
  assert.equal(normalized.sender, 'Alice Smith');
  assert.equal(normalized.email, 'alice@example.com');
  assert.equal(normalized.subject, 'Quarterly Review');
  assert.equal(normalized.unread, true);
  assert.equal(normalized.important, true);
  assert.equal(normalized.body, 'Email body content here');
});

test('Unit: Gmail actions leave important mail accessible and make undo reversible', () => {
  assert.deepEqual(gmailActionOperation('keep'), { endpoint:'modify', body:{removeLabelIds:['UNREAD']} });
  assert.deepEqual(gmailActionOperation('keep', true), { endpoint:'modify', body:{addLabelIds:['UNREAD']} });
  assert.deepEqual(gmailActionOperation('archive'), { endpoint:'modify', body:{removeLabelIds:['INBOX']} });
  assert.deepEqual(gmailActionOperation('archive', true), { endpoint:'modify', body:{addLabelIds:['INBOX']} });
  assert.deepEqual(gmailActionOperation('trash'), { endpoint:'trash', body:{} });
  assert.deepEqual(gmailActionOperation('trash', true), { endpoint:'untrash', body:{} });
});

test('Unit: encryption protects session tokens and roundtrips', () => {
  const oldKey = process.env.SESSION_ENCRYPTION_KEY;
  process.env.SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  try {
    const value = { refresh_token: 'private-token', email: 'test@example.com' };
    const ciphertext = encrypt(value);
    assert.notEqual(ciphertext, JSON.stringify(value));
    assert.deepEqual(decrypt(ciphertext), value);
    const [iv, tag, body] = ciphertext.split('.');
    const alteredBody = `${body.slice(0, -1)}${body.endsWith('A') ? 'B' : 'A'}`;
    assert.equal(decrypt(`${iv}.${tag}.${alteredBody}`), null);
  } finally {
    if (oldKey === undefined) delete process.env.SESSION_ENCRYPTION_KEY;
    else process.env.SESSION_ENCRYPTION_KEY = oldKey;
  }
});

test('Unit: malformed model output falls back to local triage', async () => {
  const oldKey = process.env.OPENROUTER_API_KEY;
  const oldProvider = process.env.AI_PROVIDER;
  const oldFetch = global.fetch;
  const oldWarn = console.warn;
  process.env.OPENROUTER_API_KEY = 'test-only-key';
  process.env.AI_PROVIDER = 'openrouter';
  console.warn = () => {};
  global.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{broken\n```' } }] }), { status: 200 });
  try {
    const result = await modelTriage([{ id: 'urgent-1', subject: 'Urgent contract approval', snippet: 'Decision needed today' }], {});
    assert.equal(result.source, 'demo');
    assert.equal(result.analyses['urgent-1'].importance, 'high');
    assert.match(result.notice, /could not analyze/i);
  } finally {
    global.fetch = oldFetch;
    console.warn = oldWarn;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
    if (oldProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = oldProvider;
  }
});

test('Unit: LM Studio triage calls the configured local model and accepts text-mode JSON', async () => {
  const saved = Object.fromEntries(['AI_PROVIDER','LM_STUDIO_BASE_URL','LM_STUDIO_MODEL','LM_STUDIO_API_KEY'].map(key => [key,process.env[key]]));
  const oldFetch = global.fetch;
  let request;
  process.env.AI_PROVIDER='lmstudio';
  process.env.LM_STUDIO_BASE_URL='http://127.0.0.1:1234/v1';
  process.env.LM_STUDIO_MODEL='test-local-model';
  delete process.env.LM_STUDIO_API_KEY;
  global.fetch=async(url,options)=>{
    request={url,body:JSON.parse(options.body)};
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({emails:[{id:'local-1',importance:'high',score:0.9,summary:'Approval needed today.',reason:'Has a same-day deadline.',suggestedAction:'keep'}]})}}]}),{status:200});
  };
  try {
    const result=await modelTriage([{id:'local-1',subject:'Approve by today',body:'Please approve this today.'}],{});
    assert.equal(request.url,'http://127.0.0.1:1234/v1/chat/completions');
    assert.equal(request.body.model,'test-local-model');
    assert.deepEqual(request.body.response_format,{type:'text'});
    assert.equal(result.source,'lmstudio');
    assert.equal(result.analyses['local-1'].importance,'high');
  } finally {
    global.fetch=oldFetch;
    for(const [key,value] of Object.entries(saved)) if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});

test('GET /api/ai/models returns available models for the active provider', async () => {
  const oldProvider=process.env.AI_PROVIDER;
  process.env.AI_PROVIDER='openrouter';
  try {
    const res = await fetch(`${baseUrl}/api/ai/models`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.models,[process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini']);
    assert.equal(data.provider,'openrouter');
  } finally { if(oldProvider===undefined)delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER=oldProvider; }
});

test('POST /api/triage uses the model selected in AI settings', async () => {
  const saved=Object.fromEntries(['AI_PROVIDER','LM_STUDIO_BASE_URL','LM_STUDIO_MODEL'].map(key=>[key,process.env[key]]));
  const realFetch=global.fetch;
  let request;
  process.env.AI_PROVIDER='lmstudio';
  process.env.LM_STUDIO_BASE_URL='http://local-model.test/v1';
  process.env.LM_STUDIO_MODEL='default-model';
  global.fetch=async(url,options)=>{
    if(String(url).startsWith('http://local-model.test/')){
      request={url,body:JSON.parse(options.body)};
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({emails:[{id:'chosen-1',importance:'medium',score:0.6,summary:'A useful update.',reason:'No deadline found.',suggestedAction:'keep'}]})}}]}),{status:200});
    }
    return realFetch(url,options);
  };
  try {
    const response=await realFetch(`${baseUrl}/api/triage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'selected-model',messages:[{id:'chosen-1',subject:'Model selection check'}]})});
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.source,'lmstudio');
    assert.equal(request.body.model,'selected-model');
    assert.equal(request.url,'http://local-model.test/v1/chat/completions');
  } finally {
    global.fetch=realFetch;
    for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});

