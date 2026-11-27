import fs from 'node:fs';

const [, , url, widthArg = '390', heightArg = '844', outPath] = process.argv;
const width = Number(widthArg);
const height = Number(heightArg);

const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page');
if (!target) throw new Error('No page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
const consoleMessages = [];
const pageErrors = [];

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    const text = message.params.args
      .map((arg) => arg.value ?? arg.description ?? arg.type)
      .join(' ');
    if (message.params.type === 'error' || message.params.type === 'warning') {
      consoleMessages.push(`${message.params.type}: ${text}`);
    }
  }
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(
      message.params.exceptionDetails.exception?.description ||
        message.params.exceptionDetails.text
    );
  }
  if (message.method === 'Log.entryAdded') {
    const entry = message.params.entry;
    if (entry.level === 'error' || entry.level === 'warning') {
      consoleMessages.push(`${entry.level}: ${entry.text}`);
    }
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: true,
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

const loaded = new Promise((resolve) => {
  const handler = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.loadEventFired') {
      ws.removeEventListener('message', handler);
      resolve();
    }
  };
  ws.addEventListener('message', handler);
});

await send('Page.navigate', { url });
await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 12000))]);
await new Promise((resolve) => setTimeout(resolve, 3500));

const expression = `(() => {
  const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right > viewport.width + 1 || rect.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        className: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }
  }
  const smallTargets = [];
  for (const el of document.querySelectorAll('button, a, input, select, textarea')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.width < 44 || rect.height < 44) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }
  return {
    title: document.title,
    viewport,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: document.documentElement.scrollWidth > viewport.width + 1,
    offenders: offenders.slice(0, 30),
    smallTargets: smallTargets.slice(0, 40),
    headings: Array.from(document.querySelectorAll('h1, h2')).map((h) => h.textContent.trim()).slice(0, 20),
    text: document.body.innerText.slice(0, 1200),
  };
})()`;

const result = await send('Runtime.evaluate', {
  expression,
  returnByValue: true,
  awaitPromise: true,
});
const metrics = result.result.value;

const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
});
if (outPath) {
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
}

console.log(
  JSON.stringify(
    {
      url,
      viewport: `${width}x${height}`,
      consoleMessages: [...new Set(consoleMessages)].slice(0, 20),
      pageErrors: [...new Set(pageErrors)].slice(0, 10),
      metrics,
      screenshot: outPath || null,
    },
    null,
    2
  )
);

ws.close();
