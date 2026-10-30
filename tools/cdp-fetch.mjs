// 用 Edge CDP 下载二进制资产（PowerShell 的 TLS 被拦，浏览器可以）
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const out = process.argv[3];
const port = process.argv[4] || '9334';
if (!url || !out) { console.error('usage: node cdp-fetch.mjs URL OUT [PORT]'); process.exit(2); }

const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(3); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
let targetId = null;
let done = false;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function finish(code) {
  if (done) return;
  done = true;
  try { ws.close(); } catch { }
  setTimeout(() => process.exit(code), 50);
}

const timer = setTimeout(() => { console.error('timeout'); finish(4); }, 45000);

ws.onmessage = async (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
    return;
  }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.url === url || r.url.startsWith(url.split('?')[0])) targetId = m.params.requestId;
  }
  if (m.method === 'Network.loadingFinished' && m.params.requestId === targetId) {
    try {
      const body = await send('Network.getResponseBody', { requestId: targetId });
      const buf = body.base64Encoded ? Buffer.from(body.body, 'base64') : Buffer.from(body.body, 'utf8');
      writeFileSync(out, buf);
      clearTimeout(timer);
      console.log('saved', out, buf.length, 'bytes');
      finish(0);
    } catch (e) {
      console.error('body error', e.message);
      finish(5);
    }
  }
};

ws.onerror = (e) => { console.error('ws error'); finish(6); };
ws.onopen = async () => {
  try {
    await send('Network.enable');
    await send('Page.enable');
    await send('Page.navigate', { url });
  } catch (e) {
    console.error('nav error', e.message);
    finish(7);
  }
};
