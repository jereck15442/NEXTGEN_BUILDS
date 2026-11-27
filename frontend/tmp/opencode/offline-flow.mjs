import fs from 'node:fs';

const APP = 'http://127.0.0.1:4173';
const email = 'nextgen.ui.1795656786055@example.com';
const password = 'TestPass123!';

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

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
  if (message.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
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

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        'Evaluation failed'
    );
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(expression, timeout = 20000, interval = 250) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeout) {
    try {
      const value = await evaluate(expression);
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }
  throw new Error(`Timed out waiting for: ${expression}${lastError ? ` (${lastError.message})` : ''}`);
}

async function navigate(url, waitText) {
  await send('Page.navigate', { url });
  await sleep(1000);
  if (waitText) {
    await waitFor(`document.body && document.body.innerText.includes(${JSON.stringify(waitText)})`, 25000);
  }
}

async function bodyText() {
  return evaluate('document.body ? document.body.innerText : ""');
}

async function setInput(selector, value) {
  const ok = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`Input not found: ${selector}`);
}

async function clickButton(text) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const ok = await evaluate(`(() => {
      const wanted = ${JSON.stringify(text)};
      const nodes = [...document.querySelectorAll('button')].filter((node) =>
        node.textContent.replace(/\\s+/g, ' ').trim().includes(wanted)
      );
      const el = nodes.find((node) => node.offsetParent !== null) || nodes[0];
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (ok) return;
    await sleep(250);
  }
  throw new Error(`Button not found: ${text}`);
}

async function setOffline(offline) {
  await send('Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
  });
  await sleep(800);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

// Start with a clean service-worker and cache state so installability checks
// evaluate the current icons instead of a previous build's precache.
try {
  await send('Page.navigate', { url: APP });
  await sleep(1500);
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await evaluate(`Promise.all([
    navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister()))
    ),
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  ]).then(() => true)`);
  await send('Page.reload', { ignoreCache: true });
  await sleep(2500);
  await waitFor(`document.body && document.body.innerText.includes('Parts that fit')`, 25000);
  await send('Network.setCacheDisabled', { cacheDisabled: false });
  record('service worker and caches reset before installability check', true, 'clean state');
} catch (error) {
  record('service worker and caches reset before installability check', false, error.message);
}

// Load the production app and wait for the service worker to control it.
try {
  await navigate(`${APP}/`, 'Parts that fit');
  const registration = await evaluate(`navigator.serviceWorker.ready.then((registration) => ({
    scope: registration.scope,
    active: Boolean(registration.active),
    scriptURL: registration.active?.scriptURL || null,
  }))`);
  record(
    'service worker registers and activates',
    registration.active && registration.scope.includes('127.0.0.1:4173'),
    `scope=${registration.scope}`
  );
  if (!(await evaluate('Boolean(navigator.serviceWorker.controller)'))) {
    await send('Page.reload');
    await sleep(2500);
    await waitFor(`document.body && document.body.innerText.includes('Parts that fit')`, 25000);
  }
  const controlled = await waitFor('Boolean(navigator.serviceWorker.controller)', 15000);
  record('service worker controls the app page', controlled, 'controller present');
} catch (error) {
  record('service worker registers and activates', false, error.message);
  record('service worker controls the app page', false, error.message);
}

// PWA installability checks through CDP. Edge returns the raw manifest in
// `data`; its `parsed` field can be empty in headless CDP, so use `data`.
try {
  const manifest = await send('Page.getAppManifest');
  const data = manifest.data ? JSON.parse(manifest.data) : {};
  const errors = manifest.errors || [];
  record(
    'web app manifest is valid',
    errors.length === 0 && Boolean(data.name) && data.display === 'standalone',
    `name=${data.name} display=${data.display} errors=${errors.length}`
  );
  const icons = data.icons || [];
  record(
    'manifest includes 192px, 512px, and maskable icons',
    icons.some((icon) => icon.sizes === '192x192') &&
      icons.some((icon) => icon.sizes === '512x512') &&
      icons.some((icon) => icon.purpose === 'maskable'),
    `icons=${icons.map((icon) => `${icon.sizes}/${icon.purpose || 'any'}`).join(', ')}`
  );
  const decodedIcons = await evaluate(`Promise.all([
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon-512x512.png',
  ].map((src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => resolve(false);
    image.src = src;
  })))`);
  record('manifest icons decode in the browser', decodedIcons.every(Boolean), `decoded=${decodedIcons.filter(Boolean).length}/${decodedIcons.length}`);
  const installability = await send('Page.getInstallabilityErrors');
  const installErrors = installability.installabilityErrors || [];
  record(
    'Chrome reports no PWA installability errors',
    installErrors.length === 0,
    installErrors.map((error) => error.errorId).join(', ') || 'none'
  );
} catch (error) {
  record('web app manifest is valid', false, error.message);
  record('manifest includes 192px, 512px, and maskable icons', false, error.message);
  record('manifest icons decode in the browser', false, error.message);
  record('Chrome reports no PWA installability errors', false, error.message);
}

// Log in and prime the product cache and cart snapshot.
try {
  await navigate(`${APP}/login`, 'Welcome Back');
  await setInput('#login-email', email);
  await setInput('#login-password', password);
  await clickButton('Sign In');
  await waitFor(`location.pathname === '/'`, 25000);
  const token = await evaluate(`localStorage.getItem('token')`);
  record('production login works', Boolean(token), `token=${token ? 'present' : 'missing'}`);
} catch (error) {
  record('production login works', false, error.message);
}

try {
  await navigate(`${APP}/products`, 'Shop Components');
  await waitFor(`document.querySelectorAll('.product-card').length >= 7`, 25000);
  await waitFor(`caches.has('nextgen-products')`, 20000);
  const cached = await evaluate(`caches.open('nextgen-products').then((cache) => cache.keys()).then((keys) => keys.map((request) => request.url))`);
  record(
    'product API response is cached by the service worker',
    cached.some((url) => url.includes('/api/v1/products')),
    `entries=${cached.length}`
  );
} catch (error) {
  record('product API response is cached by the service worker', false, error.message);
}

try {
  await navigate(`${APP}/cart`, 'Shopping Cart');
  await waitFor(`document.querySelectorAll('.cart-item').length > 0`, 25000);
  const snapshot = await evaluate(`(() => {
    const raw = localStorage.getItem('nextgen-builds:cart-snapshot');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { items: parsed.cart?.items?.length || 0, savedAt: parsed.savedAt || null };
  })()`);
  record(
    'cart snapshot is stored for offline use',
    snapshot && snapshot.items > 0,
    `items=${snapshot?.items} savedAt=${snapshot?.savedAt}`
  );
} catch (error) {
  record('cart snapshot is stored for offline use', false, error.message);
}

// Go offline.
try {
  await setOffline(true);
  const online = await evaluate('navigator.onLine');
  record('browser reports offline state', online === false, `navigator.onLine=${online}`);
  await waitFor(`document.querySelector('.offline-banner') !== null`, 15000);
  const bannerText = await evaluate(`document.querySelector('.offline-banner')?.innerText || ''`);
  record('offline banner appears', bannerText.includes('You are offline'), bannerText.replace(/\s+/g, ' ').slice(0, 90));
} catch (error) {
  record('browser reports offline state', false, error.message);
  record('offline banner appears', false, error.message);
}

// Offline catalog.
try {
  await navigate(`${APP}/products`, 'Shop Components');
  await waitFor(`document.querySelectorAll('.product-card').length >= 7`, 25000);
  const text = await bodyText();
  record(
    'offline catalog renders cached products',
    text.includes('Shop Components') && !text.includes('Failed to load products'),
    `cards=${await evaluate(`document.querySelectorAll('.product-card').length`)}`
  );
} catch (error) {
  record('offline catalog renders cached products', false, error.message);
}

// Offline cart snapshot.
try {
  await navigate(`${APP}/cart`, 'Shopping Cart');
  await waitFor(`document.querySelectorAll('.cart-item').length > 0`, 25000);
  const text = await bodyText();
  record(
    'offline cart shows the saved snapshot',
    text.includes('Showing your saved cart') && text.includes('You are offline'),
    'snapshot notice visible'
  );
} catch (error) {
  record('offline cart shows the saved snapshot', false, error.message);
}

// Offline checkout.
try {
  await navigate(`${APP}/checkout`, 'Checkout');
  await waitFor(`document.body.innerText.includes("You're offline") || document.body.innerText.includes('You are offline')`, 20000);
  const disabled = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Place Order'));
    return button ? button.disabled : null;
  })()`);
  record('offline checkout is blocked', disabled === true, `PlaceOrder.disabled=${disabled}`);
} catch (error) {
  record('offline checkout is blocked', false, error.message);
}

// Offline login.
try {
  await navigate(`${APP}/login`, 'Welcome Back');
  await waitFor(`document.body.innerText.includes("You're offline")`, 20000);
  const disabled = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Sign In'));
    return button ? button.disabled : null;
  })()`);
  record('offline login is blocked', disabled === true, `SignIn.disabled=${disabled}`);
} catch (error) {
  record('offline login is blocked', false, error.message);
}

// Offline AI.
try {
  await navigate(`${APP}/ai-assistant`, 'AI Assistant');
  await waitFor(`document.body.innerText.includes("You're offline")`, 20000);
  const disabled = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Get AI Recommendations'));
    return button ? button.disabled : null;
  })()`);
  record('offline AI recommendations are blocked', disabled === true, `AI.disabled=${disabled}`);
} catch (error) {
  record('offline AI recommendations are blocked', false, error.message);
}

// Precached offline fallback page.
try {
  await navigate(`${APP}/offline.html`, "You're Offline");
  const text = await bodyText();
  record(
    'precached offline.html is reachable offline',
    text.includes("You're Offline") && text.includes('Try Again'),
    'fallback page rendered'
  );
} catch (error) {
  record('precached offline.html is reachable offline', false, error.message);
}

// Restore connectivity and confirm recovery.
try {
  await setOffline(false);
  await navigate(`${APP}/products`, 'Shop Components');
  await waitFor(`document.querySelectorAll('.product-card').length >= 7`, 25000);
  record('app recovers when the connection returns', true, 'catalog reloaded online');
} catch (error) {
  record('app recovers when the connection returns', false, error.message);
}

const failed = results.filter((item) => !item.ok);
const report = {
  app: APP,
  email,
  consoleMessages: [...new Set(consoleMessages)].slice(0, 40),
  pageErrors: [...new Set(pageErrors)].slice(0, 20),
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
fs.writeFileSync('tmp/opencode/offline-flow-report.json', JSON.stringify(report, null, 2));
console.log('\nSUMMARY');
console.log(JSON.stringify(report, null, 2));
ws.close();
process.exit(failed.length === 0 ? 0 : 1);
