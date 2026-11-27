import { spawnSync } from 'node:child_process';

const base = 'http://127.0.0.1:5173';
const viewports = [
  [360, 800],
  [390, 844],
  [412, 915],
  [800, 600],
];

const productsResponse = await fetch('http://localhost:4000/api/v1/products?limit=1');
const productsData = await productsResponse.json();
const productId = productsData.items?.[0]?._id;
if (!productId) throw new Error('No product id available for /products/:id checks');

const routes = [
  '/',
  '/products',
  `/products/${productId}`,
  '/login',
  '/register',
  '/ai-assistant',
  '/offline.html',
  '/pc-builder',
];

const only = process.argv[2];
const selectedRoutes = only ? routes.filter((route) => route === only) : routes;

function runCheck(url, width, height) {
  const result = spawnSync(
    process.execPath,
    ['tmp/opencode/cdp-check.mjs', url, String(width), String(height)],
    { encoding: 'utf8', timeout: 90000 }
  );
  if (result.status !== 0) {
    return {
      url,
      viewport: `${width}x${height}`,
      fatal: (result.stderr || result.stdout || 'unknown error').slice(0, 600),
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    const metrics = parsed.metrics || {};
    const smallButtons = (metrics.smallTargets || []).filter((t) => t.tag === 'button');
    const smallInputs = (metrics.smallTargets || []).filter((t) => t.tag === 'input');
    const smallLinks = (metrics.smallTargets || []).filter((t) => t.tag === 'a');
    return {
      url,
      viewport: `${width}x${height}`,
      title: metrics.title,
      renderedViewport: metrics.viewport,
      overflow: metrics.overflow,
      scrollWidth: metrics.scrollWidth,
      consoleMessages: parsed.consoleMessages,
      pageErrors: parsed.pageErrors,
      smallButtons,
      smallInputs,
      smallLinkCount: smallLinks.length,
      headings: metrics.headings,
      textStart: (metrics.text || '').replace(/\s+/g, ' ').slice(0, 180),
    };
  } catch (error) {
    return {
      url,
      viewport: `${width}x${height}`,
      fatal: `parse failed: ${error.message}`,
      raw: result.stdout.slice(0, 400),
    };
  }
}

const summary = [];
for (const route of selectedRoutes) {
  for (const [width, height] of viewports) {
    const check = runCheck(`${base}${route}`, width, height);
    summary.push(check);
    const status = check.fatal
      ? `FATAL ${check.fatal}`
      : `overflow=${check.overflow} console=${check.consoleMessages?.length || 0} errors=${check.pageErrors?.length || 0} smallButtons=${check.smallButtons?.length || 0}`;
    console.log(`${route} ${width}x${height}: ${status}`);
  }
}

console.log('\nJSON_SUMMARY');
console.log(JSON.stringify(summary, null, 2));
