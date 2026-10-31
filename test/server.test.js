const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { server, parseCookies, sign, encrypt, decrypt, normalizeEmail, fallbackTriage, modelTriage, gmailActionOperation } = require('../server.js');

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
