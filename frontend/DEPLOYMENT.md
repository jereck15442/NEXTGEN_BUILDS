# Frontend deployment notes

No deployment has been performed from this workspace. The files below prepare the static
frontend for Vercel or Netlify; they do not publish the site.

## Build output

```powershell
cd frontend
npm install
npm run build
```

The deployable site is `frontend/dist/`. It contains the SPA, the generated web app manifest,
the service worker, and the precached offline page.

## Environment variable

`VITE_API_BASE_URL` is read at build time and must point at the deployed API:

```text
VITE_API_BASE_URL=https://your-api-host.example.com/api/v1
```

The local development value is `http://localhost:4000/api/v1`. Set the variable in the hosting
provider's environment settings before building, then rebuild after changing it.

The backend must be reachable over HTTPS from the browser. The current backend uses Express
`cors()` with default settings; if CORS is restricted for production, allow the frontend origin.

## Vercel

1. Import the repository and set the project root to `frontend/`.
2. `vercel.json` already configures Vite, `npm run build`, `dist/`, an SPA rewrite to
   `index.html`, and no-cache headers for `sw.js` and `registerSW.js`.
3. Add `VITE_API_BASE_URL` in Project Settings → Environment Variables.
4. Deploy, then run the smoke checks below.

## Netlify

1. Set the site root to `frontend/`.
2. `netlify.toml` already configures `npm run build`, publish directory `dist`, an SPA
   redirect to `index.html`, and no-cache headers for the service-worker entry points.
3. Add `VITE_API_BASE_URL` in Site settings → Environment variables.
4. Deploy, then run the smoke checks below.

## Post-deploy smoke checks

- `/`, `/products`, `/login`, `/register`, `/pc-builder`, and `/offline.html` return the SPA.
- A deep link such as `/products/PRODUCT_ID` refreshes correctly.
- Register, login, add to cart, update quantity, and place an order.
- Checkout redirects to the provider sandbox URL returned by `POST /orders`.
- Order history shows the pending order and cancellation works.
- PC Builder validates, saves, and adds a build to the cart.
- Admin login can create, edit, and deactivate a product and sees the low-stock panel.
- The service worker installs, the product catalog works offline after first visit, and the
  offline banner appears when connectivity is lost.
- In the browser install prompt or DevTools Application panel, the manifest has no installability
  errors and all three icons decode.

## Known backend constraints reflected in the UI

- `POST /orders` may return a hosted Maya sandbox `checkoutUrl`; the frontend follows it. No
  real charge is made in sandbox.
- Backend payment return URLs (`/api/v1/payments/return/{success|failure|cancel}`) return JSON
  instead of redirecting to the frontend, so payment status is checked from order history or the
  `/payment/success` and `/payment/cancelled` pages when an `orderId` is available.
- The API accepts no shipping or address fields, so checkout does not render fake shipping inputs.
- The AI advisor returns a controlled `503` when the AI provider is unreachable; the UI shows an
  honest unavailable state. With `GEMINI_API_KEY` configured and a current model (e.g.
  `gemini-3.8-flash`), the advisor returns live recommendations.
- Product records have no image URL field; the frontend uses category artwork placeholders.
- Supported product categories are CPU, motherboard, GPU, RAM, storage, PSU, and case.
