const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { server, parseCookies, sign, encrypt, decrypt, normalizeEmail, fallbackTriage } = require('../server.js');

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
