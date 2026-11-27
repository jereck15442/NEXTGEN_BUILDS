const API = 'http://localhost:4000/api/v1';
const stamp = Date.now();
const email = `nextgen.test.${stamp}@example.com`;
const password = 'TestPass123!';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data };
}

const register = await request('/auth/register', {
  method: 'POST',
  body: { name: 'NextGen Test User', email, password },
});
record(
  'register returns the public user without a token',
  register.status === 201 && register.data?.email === email && !register.data?.token,
  `status=${register.status} user=${register.data?.email}`
);
const login = await request('/auth/login', {
  method: 'POST',
  body: { email, password },
});
record(
  'login after registration returns a token',
  login.status === 200 && Boolean(login.data?.token) && login.data?.user?.email === email,
  `status=${login.status} user=${login.data?.user?.email}`
);
const token = login.data?.token;
if (!token) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
}

const products = await request('/products?limit=100');
const productList = Array.isArray(products.data?.items) ? products.data.items : [];
const product = productList.find((item) => Number(item.stock) > 1);
record('catalog returns seeded products', productList.length > 0 && Boolean(product), `${productList.length} products`);

const add = await request('/cart/items', {
  method: 'POST',
  token,
  body: { productId: product._id, quantity: 1 },
});
record('add to cart returns populated cart', add.status === 201 && add.data?.items?.some((item) => item.product?._id === product._id), `status=${add.status}`);

const cartAfterAdd = await request('/cart', { token });
const addedItem = cartAfterAdd.data?.items?.find((item) => item.product?._id === product._id);
record('cart GET includes product and quantity', cartAfterAdd.status === 200 && addedItem?.quantity === 1, `quantity=${addedItem?.quantity}`);

const update = await request(`/cart/items/${product._id}`, {
  method: 'PATCH',
  token,
  body: { quantity: 2 },
});
const updatedItem = update.data?.items?.find((item) => item.product?._id === product._id);
record('cart quantity update persists', update.status === 200 && updatedItem?.quantity === 2, `quantity=${updatedItem?.quantity}`);

const createOrder = await request('/orders', { method: 'POST', token });
const order = createOrder.data?.order;
const payment = createOrder.data?.payment;
record(
  'create order returns order and sandbox payment',
  createOrder.status === 201 &&
    Boolean(order?._id) &&
    order.paymentStatus === 'pending' &&
    payment?.checkoutUrl === null,
  `status=${createOrder.status} order=${order?._id} checkoutUrl=${payment?.checkoutUrl}`
);
record(
  'order totals are server-calculated',
  order?.total === product.price * 2 && order?.subtotal === product.price * 2,
  `subtotal=${order?.subtotal} total=${order?.total}`
);

const cartAfterOrder = await request('/cart', { token });
record('cart is cleared after order creation', cartAfterOrder.data?.items?.length === 0, `items=${cartAfterOrder.data?.items?.length}`);

const orderDetail = await request(`/orders/${order._id}`, { token });
record('order detail is readable by owner', orderDetail.status === 200 && orderDetail.data?._id === order._id, `status=${orderDetail.status}`);

const cancel = await request(`/orders/${order._id}/cancel`, { method: 'POST', token });
record(
  'order cancellation sets both statuses',
  cancel.status === 200 && cancel.data?.paymentStatus === 'cancelled' && cancel.data?.fulfillmentStatus === 'cancelled',
  `status=${cancel.status} payment=${cancel.data?.paymentStatus} fulfillment=${cancel.data?.fulfillmentStatus}`
);

const cancelAgain = await request(`/orders/${order._id}/cancel`, { method: 'POST', token });
record('second cancellation is rejected', cancelAgain.status === 409, `status=${cancelAgain.status} message=${cancelAgain.data?.message}`);

const advisor = await request('/advisor/recommend', {
  method: 'POST',
  token,
  body: { budget: 50000, usage: 'gaming' },
});
record(
  'AI advisor returns honest 503 without a Gemini key',
  advisor.status === 503 && /temporarily unavailable/i.test(advisor.data?.message || ''),
  `status=${advisor.status} message=${advisor.data?.message}`
);

const cpu = productList.find((item) => item.category === 'CPU');
const motherboard = productList.find((item) => item.category === 'motherboard');
const compatibility = await request('/compatibility/check', {
  method: 'POST',
  body: { components: { CPU: cpu._id, motherboard: motherboard._id } },
});
record(
  'compatibility check returns components and result',
  compatibility.status === 200 && compatibility.data?.components?.CPU?._id === cpu._id && typeof compatibility.data?.compatible === 'boolean',
  `status=${compatibility.status} compatible=${compatibility.data?.compatible} warnings=${compatibility.data?.warnings?.length}`
);

const buildName = `Test Build ${stamp}`;
const build = await request('/builds', {
  method: 'POST',
  token,
  body: { name: buildName, components: { CPU: cpu._id, motherboard: motherboard._id } },
});
record('save build requires and returns a name', build.status === 201 && build.data?.name === buildName, `status=${build.status} id=${build.data?._id}`);

const builds = await request('/builds', { token });
record('saved build appears in build list', builds.status === 200 && builds.data?.some((item) => item._id === build.data?._id), `count=${builds.data?.length}`);

const buildCart = await request(`/builds/${build.data._id}/cart`, { method: 'POST', token });
record(
  'add build to cart returns cart and compatibility',
  buildCart.status === 201 && buildCart.data?.cart?.items?.length >= 2 && typeof buildCart.data?.compatibility?.compatible === 'boolean',
  `status=${buildCart.status} items=${buildCart.data?.cart?.items?.length} compatible=${buildCart.data?.compatibility?.compatible}`
);

const adminLogin = await request('/auth/login', {
  method: 'POST',
  body: { email: 'admin@example.com', password: 'Admin123!' },
});
record('admin login works', adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin', `status=${adminLogin.status}`);
const adminToken = adminLogin.data?.token;

const lowStock = await request('/products/admin/low-stock', { token: adminToken });
record('admin low-stock endpoint returns items', lowStock.status === 200 && Array.isArray(lowStock.data?.items), `status=${lowStock.status} items=${lowStock.data?.items?.length}`);

const testProductName = `Test GPU ${stamp}`;
const createdProduct = await request('/products', {
  method: 'POST',
  token: adminToken,
  body: {
    name: testProductName,
    description: 'Temporary product created by the delivery verification flow.',
    category: 'GPU',
    price: 1234,
    stock: 1,
    lowStockThreshold: 2,
    specifications: { memory: '8GB' },
  },
});
record('admin can create a product', createdProduct.status === 201 && createdProduct.data?.name === testProductName, `status=${createdProduct.status} id=${createdProduct.data?._id}`);

const lowStockAfterCreate = await request('/products/admin/low-stock', { token: adminToken });
record(
  'new low-stock product is reported by the admin endpoint',
  lowStockAfterCreate.data?.items?.some((item) => item._id === createdProduct.data?._id),
  `items=${lowStockAfterCreate.data?.items?.length}`
);

const updatedProduct = await request(`/products/${createdProduct.data._id}`, {
  method: 'PATCH',
  token: adminToken,
  body: { stock: 10, lowStockThreshold: 2 },
});
record('admin can edit a product', updatedProduct.status === 200 && updatedProduct.data?.stock === 10, `status=${updatedProduct.status} stock=${updatedProduct.data?.stock}`);

const lowStockAfterEdit = await request('/products/admin/low-stock', { token: adminToken });
record(
  'edited product leaves the low-stock list',
  !lowStockAfterEdit.data?.items?.some((item) => item._id === createdProduct.data?._id),
  `items=${lowStockAfterEdit.data?.items?.length}`
);

const deactivated = await request(`/products/${createdProduct.data._id}`, { method: 'DELETE', token: adminToken });
record('admin can deactivate a product', deactivated.status === 200 && deactivated.data?.active === false, `status=${deactivated.status} active=${deactivated.data?.active}`);

const deactivatedLookup = await request(`/products/${createdProduct.data._id}`);
record('deactivated product is no longer public', deactivatedLookup.status === 404, `status=${deactivatedLookup.status}`);

const failed = results.filter((item) => !item.ok);
console.log('\nSUMMARY');
console.log(JSON.stringify({ email, password, orderId: order?._id, buildId: build.data?._id, testProductId: createdProduct.data?._id, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
