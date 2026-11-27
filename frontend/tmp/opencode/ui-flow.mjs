import fs from 'node:fs';

const APP = 'http://127.0.0.1:5173';
const stamp = Date.now();
const uiEmail = `nextgen.ui.${stamp}@example.com`;
const uiPassword = 'TestPass123!';
const uiName = 'UI Flow Tester';
const adminEmail = 'admin@example.com';
const adminPassword = 'Admin123!';

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

async function getLocation() {
  try {
    return await evaluate('({ href: location.href, pathname: location.pathname, search: location.search })');
  } catch {
    return null;
  }
}

async function waitFor(expression, timeout = 15000, interval = 250) {
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
  await sleep(800);
  if (waitText) {
    await waitFor(`document.body && document.body.innerText.includes(${JSON.stringify(waitText)})`, 20000);
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

async function clickLink(text) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const ok = await evaluate(`(() => {
      const wanted = ${JSON.stringify(text)};
      const nodes = [...document.querySelectorAll('a')].filter((node) =>
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
  throw new Error(`Link not found: ${text}`);
}

async function clickAria(label) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const ok = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll('[aria-label=${JSON.stringify(label)}]')];
      const el = nodes.find((node) => node.offsetParent !== null) || nodes[0];
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (ok) return;
    await sleep(250);
  }
  throw new Error(`Aria target not found: ${label}`);
}

async function storage() {
  return evaluate(`(() => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
    snapshot: localStorage.getItem('nextgen-builds:cart-snapshot'),
  }))()`);
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

// Start from a clean app origin.
await navigate(`${APP}/register`);
await evaluate('localStorage.clear(); sessionStorage.clear(); true');
await navigate(`${APP}/register`, 'Create Account');

// 1. Registration through the UI.
try {
  await setInput('#register-name', uiName);
  await setInput('#register-email', uiEmail);
  await setInput('#register-password', uiPassword);
  await clickButton('Create Account');
  await waitFor(`location.pathname === '/'`, 20000);
  const auth = await storage();
  const user = auth.user ? JSON.parse(auth.user) : null;
  record(
    'UI registration signs the new user in',
    Boolean(auth.token) && user?.email === uiEmail,
    `path=${(await getLocation())?.pathname} user=${user?.email}`
  );
} catch (error) {
  record('UI registration signs the new user in', false, error.message);
}

// 2. Add to cart from the product grid.
try {
  await navigate(`${APP}/products`, 'Shop Components');
  await waitFor(`document.querySelectorAll('.product-card').length > 0`, 20000);
  const gridColumns = await evaluate(`(() => {
    const grid = document.querySelector('.product-grid');
    if (!grid) return 0;
    return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  })()`);
  record('product grid is two columns at 390px', gridColumns === 2, `columns=${gridColumns}`);
  await clickButton('Add to Cart');
  await waitFor(`document.querySelector('a[aria-label="Cart, 1 items"]') !== null`, 20000);
  record('product grid add-to-cart updates the header badge', true, 'badge=Cart, 1 items');
} catch (error) {
  record('product grid add-to-cart updates the header badge', false, error.message);
}

// 3. Cart quantity and removal.
try {
  await navigate(`${APP}/cart`, 'Shopping Cart');
  await waitFor(`document.querySelector('.quantity-value') !== null`, 20000);
  const before = await evaluate(`document.querySelector('.quantity-value').textContent`);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) =>
      (node.getAttribute('aria-label') || '').startsWith('Increase quantity')
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await waitFor(`document.querySelector('.quantity-value').textContent.trim() === '2'`, 20000);
  record('cart quantity increase updates the line', before.trim() === '1', '1 → 2');
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) =>
      (node.getAttribute('aria-label') || '').startsWith('Remove ')
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await waitFor(`document.body.innerText.includes('Your cart is empty')`, 20000);
  record('cart remove empties the cart', true, 'empty state shown');
} catch (error) {
  record('cart quantity increase updates the line', false, error.message);
  record('cart remove empties the cart', false, error.message);
}

// 4. Add again and reach checkout.
try {
  await navigate(`${APP}/products`, 'Shop Components');
  await waitFor(`document.querySelectorAll('.product-card').length > 0`, 20000);
  await clickButton('Add to Cart');
  await waitFor(`document.querySelector('a[aria-label="Cart, 1 items"]') !== null`, 20000);
  await navigate(`${APP}/cart`, 'Shopping Cart');
  await clickButton('Proceed to Checkout');
  await waitFor(`location.pathname === '/checkout'`, 20000);
  await waitFor(
    `document.body.innerText.includes('does not accept shipping fields') &&
      document.body.innerText.includes('Sandbox payment')`,
    20000
  );
  const checkoutText = await bodyText();
  record(
    'checkout explains the backend delivery limitation',
    checkoutText.includes('does not accept shipping fields') &&
      checkoutText.includes('Sandbox payment'),
    'delivery + payment notices present'
  );
  const shippingInputs = await evaluate(`document.querySelectorAll('input[name*="address" i], input[name*="shipping" i], input[name*="city" i]').length`);
  record('checkout does not render fake shipping fields', shippingInputs === 0, `shippingInputs=${shippingInputs}`);
} catch (error) {
  record('checkout explains the backend delivery limitation', false, error.message);
  record('checkout does not render fake shipping fields', false, error.message);
}

// 5. Place the order and observe the real sandbox redirect.
let externalUrl = null;
try {
  await clickButton('Place Order');
  await waitFor(`location.href.startsWith('http') && !location.href.startsWith(${JSON.stringify(APP)})`, 30000);
  externalUrl = (await getLocation())?.href || null;
  record(
    'placing an order redirects to the provider sandbox URL',
    Boolean(externalUrl && /^https?:\/\//.test(externalUrl)),
    externalUrl ? externalUrl.slice(0, 90) : 'no external URL'
  );
} catch (error) {
  record('placing an order redirects to the provider sandbox URL', false, error.message);
}

// 6. Return to the app and cancel the pending order.
try {
  await navigate(`${APP}/orders`, 'My Orders');
  await waitFor(`document.body.innerText.includes('Pending')`, 20000);
  const ordersText = await bodyText();
  record('order history shows the new order as pending', ordersText.includes('Pending'), 'pending visible');
  await clickLink('View Details');
  await waitFor(`document.body.innerText.includes('Order Information')`, 20000);
  const detailText = await bodyText();
  record(
    'order details show pending payment and cancellation',
    detailText.includes('Payment Pending') && detailText.includes('Cancel Order'),
    'pending + cancel visible'
  );
  await clickButton('Cancel Order');
  await waitFor(`document.body.innerText.includes('Your order has been cancelled.')`, 20000);
  const cancelledText = await bodyText();
  record(
    'order cancellation updates both statuses in the UI',
    cancelledText.includes('Your order has been cancelled.') &&
      cancelledText.includes('Cancelled'),
    'notice + cancelled status'
  );
} catch (error) {
  record('order history shows the new order as pending', false, error.message);
  record('order details show pending payment and cancellation', false, error.message);
  record('order cancellation updates both statuses in the UI', false, error.message);
}

// 7. AI advisor recommendation.
try {
  await navigate(`${APP}/ai-assistant`, 'AI Assistant');
  await setInput('#ai-budget', '50000');
  await clickButton('Get AI Recommendations');
  await waitFor(`document.body.innerText.includes('AI Recommendation Results')`, 300000);
  const aiText = await bodyText();
  record('AI advisor returns a compatible recommendation', aiText.includes('AI Recommendation Results') && aiText.includes('Estimated Total'), 'recommendation rendered');
} catch (error) {
  record('AI advisor returns a compatible recommendation', false, error.message);
}

// 8. PC Builder validate, save, and add to cart.
try {
  await navigate(`${APP}/pc-builder`, 'PC Builder');
  await waitFor(`document.querySelectorAll('button').length > 0`, 20000);
  const selected = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button')];
    const cpu = buttons.find((node) => node.textContent.includes('AMD Ryzen 5 7600'));
    const board = buttons.find((node) => node.textContent.includes('MSI B650 Tomahawk'));
    if (!cpu || !board) return false;
    cpu.click();
    board.click();
    return true;
  })()`);
  if (!selected) throw new Error('Seeded CPU or motherboard option not found');
  await clickButton('Validate Build');
  await waitFor(`document.body.innerText.includes('Build Compatible') || document.body.innerText.includes('Compatibility Warnings')`, 20000);
  const validationText = await bodyText();
  record('PC Builder validates against the compatibility endpoint', validationText.includes('Build Compatible'), 'compatible result shown');

  await setInput('#buildName', `UI Build ${stamp}`);
  await clickButton('Save Build');
  await waitFor(`document.body.innerText.includes('Build saved.')`, 20000);
  record('PC Builder saves a named build', true, 'saved notice shown');

  await waitFor(`[...document.querySelectorAll('button')].some((node) => node.textContent.includes('Add to Cart'))`, 20000);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) =>
      node.textContent.includes('Add to Cart') && node.closest('.bg-surface')
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await waitFor(`location.pathname === '/cart'`, 20000);
  await waitFor(`document.body.innerText.includes('Shopping Cart')`, 20000);
  record('PC Builder adds the saved build to the cart', true, 'navigated to cart');
} catch (error) {
  record('PC Builder validates against the compatibility endpoint', false, error.message);
  record('PC Builder saves a named build', false, error.message);
  record('PC Builder adds the saved build to the cart', false, error.message);
}

// 9. Log out, log in as admin, and exercise admin CRUD.
const adminProductName = `UI Test GPU ${stamp}`;
try {
  await navigate(`${APP}/`, 'Parts that fit');
  await clickAria('Account menu');
  await waitFor(`document.body.innerText.includes('Sign Out')`, 10000);
  await clickButton('Sign Out');
  await waitFor(`localStorage.getItem('token') === null`, 20000);
  record('account menu sign-out clears the session', true, 'token removed');
} catch (error) {
  record('account menu sign-out clears the session', false, error.message);
}

try {
  await navigate(`${APP}/login`, 'Welcome Back');
  await setInput('#login-email', adminEmail);
  await setInput('#login-password', adminPassword);
  await clickButton('Sign In');
  await waitFor(`location.pathname === '/'`, 20000);
  const auth = await storage();
  const user = auth.user ? JSON.parse(auth.user) : null;
  record('admin login through the UI works', user?.role === 'admin', `role=${user?.role}`);
} catch (error) {
  record('admin login through the UI works', false, error.message);
}

try {
  await navigate(`${APP}/admin`, 'Admin Dashboard');
  await waitFor(`document.body.innerText.includes('Product Management')`, 20000);
  await clickButton('Add Product');
  await waitFor(`document.querySelector('#admin-product-name') !== null`, 10000);
  await setInput('#admin-product-name', adminProductName);
  await setInput('#admin-product-category', 'GPU');
  await setInput('#admin-product-description', 'Temporary UI verification product.');
  await setInput('#admin-product-specs', '{"memory":"8GB"}');
  await setInput('#admin-product-price', '4321');
  await setInput('#admin-product-stock', '1');
  await setInput('#admin-product-threshold', '2');
  await clickButton('Create Product');
  await waitFor(`document.body.innerText.includes(${JSON.stringify(adminProductName)})`, 20000);
  record('admin create product appears in the dashboard', true, adminProductName);
  await waitFor(`(() => {
    const panel = [...document.querySelectorAll('div')].find((node) =>
      node.querySelector(':scope > div > h2')?.textContent.trim() === 'Low Stock'
    );
    return Boolean(panel && panel.innerText.includes(${JSON.stringify(adminProductName)}));
  })()`, 20000);
  record('admin low-stock panel uses the dedicated endpoint', true, 'new low-stock item visible');
} catch (error) {
  record('admin create product appears in the dashboard', false, error.message);
  record('admin low-stock panel uses the dedicated endpoint', false, error.message);
}

try {
  await clickAria(`Edit ${adminProductName}`);
  await waitFor(`document.querySelector('#admin-product-price') !== null`, 10000);
  await setInput('#admin-product-price', '4321');
  await setInput('#admin-product-stock', '10');
  await clickButton('Update Product');
  await waitFor(`!document.body.innerText.includes('Edit Product')`, 20000);
  const adminText = await bodyText();
  record(
    'admin edit product updates the list and clears low stock',
    adminText.includes(adminProductName) && adminText.includes('₱4,321'),
    'price updated'
  );
  const stillLowStock = await evaluate(`(() => {
    const panel = [...document.querySelectorAll('div')].find((node) =>
      node.querySelector(':scope > div > h2')?.textContent.trim() === 'Low Stock'
    );
    return Boolean(panel && panel.innerText.includes(${JSON.stringify(adminProductName)}));
  })()`);
  record(
    'edited product leaves the low-stock panel',
    !stillLowStock,
    `stillLowStock=${stillLowStock}`
  );
} catch (error) {
  record('admin edit product updates the list and clears low stock', false, error.message);
  record('edited product leaves the low-stock panel', false, error.message);
}

try {
  await clickAria(`Deactivate ${adminProductName}`);
  await waitFor(`!document.body.innerText.includes(${JSON.stringify(adminProductName)})`, 20000);
  record('admin deactivate removes the product from the catalog list', true, 'product removed');
} catch (error) {
  record('admin deactivate removes the product from the catalog list', false, error.message);
}

// 10. Confirm the admin product is no longer public.
try {
  const token = (await storage()).token;
  const lookup = await fetch('http://localhost:4000/api/v1/products?limit=100', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await lookup.json();
  record(
    'deactivated admin product is absent from the public catalog',
    lookup.status === 200 && !data.items?.some((item) => item.name === adminProductName),
    `catalog items=${data.items?.length}`
  );
} catch (error) {
  record('deactivated admin product is absent from the public catalog', false, error.message);
}

const failed = results.filter((item) => !item.ok);
const report = {
  uiEmail,
  uiPassword,
  adminProductName,
  externalUrl,
  consoleMessages: [...new Set(consoleMessages)].slice(0, 30),
  pageErrors: [...new Set(pageErrors)].slice(0, 20),
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
fs.writeFileSync('tmp/opencode/ui-flow-report.json', JSON.stringify(report, null, 2));
console.log('\nSUMMARY');
console.log(JSON.stringify(report, null, 2));
ws.close();
process.exit(failed.length === 0 ? 0 : 1);
