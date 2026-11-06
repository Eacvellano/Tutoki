// Minimal Chrome DevTools Protocol driver (no dependencies). Usage: const b = await launch(); const page = await b.page();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Profiles and screenshots go to the OS temp folder, never into the repo.
const SCRATCH = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tutoki-e2e-'));
console.log('screenshots:', SCRATCH);

const HELPERS = `window.__t = {
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async wait(sel, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length); if (el) return true; await __t.sleep(80); } throw new Error('timeout waiting for ' + sel + ' on ' + location.hash); },
  async click(sel) { await __t.wait(sel); const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length); if (el.disabled) throw new Error('disabled: ' + sel); el.click(); await __t.sleep(120); },
  async fill(sel, value) { await __t.wait(sel); const el = document.querySelector(sel); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); },
  async submit(sel) { await __t.wait(sel); const f = document.querySelector(sel); const b = f.querySelector('button[type=submit],button:not([type])'); b.click(); await __t.sleep(200); },
  text: sel => document.querySelector(sel)?.textContent.trim() || '',
};`;

async function launch(port = 9333) {
  const profile = path.join(SCRATCH, `chrome-profile-${Date.now()}`);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let info;
  for (let i = 0; i < 50 && !info; i++) { await new Promise(r => setTimeout(r, 200)); info = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()).catch(() => null); }
  if (!info) throw new Error('Chrome did not start');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let seq = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
    else listeners.forEach(l => l(msg));
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  return {
    async page() {
      const { browserContextId } = await send('Target.createBrowserContext');
      const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const errors = [];
      listeners.push(m => {
        if (m.sessionId !== sessionId) return;
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
      });
      const s = (m, p) => send(m, p, sessionId);
      await s('Runtime.enable'); await s('Page.enable');
      await s('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });
      return {
        errors,
        goto: async url => { await s('Page.navigate', { url }); await new Promise(r => setTimeout(r, 900)); },
        run: async expr => {
          const r = await s('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
          return r.result.value;
        },
        shot: async (name, width = 1280) => {
          await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
          await new Promise(r => setTimeout(r, 300));
          const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          fs.writeFileSync(path.join(SCRATCH, `${name}.png`), Buffer.from(data, 'base64'));
        },
      };
    },
    close: () => { ws.close(); proc.kill(); },
  };
}
module.exports = { launch };
