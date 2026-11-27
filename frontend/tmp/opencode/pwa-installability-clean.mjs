const APP = 'http://127.0.0.1:4173';

const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page');
if (!target) throw new Error('No page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
  else entry.resolve(message.result);
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

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: APP });
await sleep(1500);

await evaluate(`Promise.all([
  navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister()))
  ),
  caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
]).then(() => true)`);
await send('Page.reload', { ignoreCache: true });
await sleep(3000);

const icons = await evaluate(`Promise.all([
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
].map((src) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve({ src, loaded: true, width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => resolve({ src, loaded: false, width: 0, height: 0 });
  image.src = src;
})))`);

const manifest = await send('Page.getAppManifest');
const installability = await send('Page.getInstallabilityErrors');
const parsed = manifest.parsed || {};
const data = manifest.data ? JSON.parse(manifest.data) : null;

console.log(JSON.stringify({
  icons,
  manifestUrl: manifest.url,
  parsedName: parsed.name ?? null,
  parsedDisplay: parsed.display ?? null,
  parsedIcons: (parsed.icons || []).map((icon) => `${icon.sizes}/${icon.purpose || 'any'}`),
  dataName: data?.name ?? null,
  dataIcons: (data?.icons || []).map((icon) => `${icon.sizes}/${icon.purpose || 'any'}`),
  manifestErrors: manifest.errors || [],
  installabilityErrors: installability.installabilityErrors || [],
}, null, 2));

ws.close();
