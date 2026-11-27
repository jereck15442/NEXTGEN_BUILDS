# PC Parts Store API

REST API for the AI-enhanced PC Parts Store. The API uses Node.js, Express, MongoDB, and Mongoose.

## Project layout

The backend lives in [`backend/`](./backend). Run the commands below from that directory.

```
project-root/
  backend/          Node.js/Express API, tests, OpenAPI definition
  README.md
  .mcp.json         MongoDB Atlas MCP server configuration
```

## Source layout

- `src/routes/` — Express routers and middleware chains only
- `src/controllers/` — request handling and response formatting
- `src/services/` — business rules, checkout, pricing, inventory
- `src/repositories/` — Mongoose data access
- `src/models/` — Mongoose schemas
- `src/middleware/` — auth, roles, validation, errors, rate limits
- `src/patterns/` — pricing strategies, payment providers, order observers
- `src/validators/` — Zod request schemas
- `src/utils/` — money, dates, errors, logging

## Requirements

- Node.js 20 or newer
- MongoDB configured as a replica set (MongoDB Atlas is suitable)
- Postman, if testing requests manually

Checkout and stock reservations use MongoDB transactions. A standalone local MongoDB server does not support these transactions; use Atlas or configure local MongoDB as a replica set.

## Run locally

In PowerShell, from the project directory:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `.env`. Set `MONGODB_URI` to your replica-set connection string and replace `JWT_SECRET` with a long random secret. Set `GEMINI_API_KEY` if you want to test the AI advisor. Keep secrets private and do not commit `.env`.

Check the MongoDB connection before seeding:

```powershell
node test-db.js
```

Or run the same check with `npm run test:db`. The script reads `MONGODB_URI` from `.env` and reports a generic connection error without printing your connection string.

Then seed sample products and the development admin account, and start the API:

```powershell
npm run seed
npm run dev
```

The API listens at `http://localhost:4000`. Swagger UI is available at [http://localhost:4000/api-docs](http://localhost:4000/api-docs), and the OpenAPI definition is in [`backend/openapi.yaml`](./backend/openapi.yaml).

The seed script creates an admin account:

- Email: `admin@example.com`
- Password: `Admin123!`

This is a development-only account. Do not use these credentials in a deployed environment.

## Test with Postman

### 1. Create a collection and variables

Create a Postman collection and add these collection variables:

| Variable | Initial value |
| --- | --- |
| `baseUrl` | `http://localhost:4000` |
| `token` | *(blank)* |
| `productId` | *(blank)* |
| `orderId` | *(blank)* |

For authenticated requests, select **Authorization** → **Bearer Token** and enter `{{token}}`.

### 2. Register and log in

Register a customer:

```http
POST {{baseUrl}}/api/v1/auth/register
Content-Type: application/json
```

```json
{
  "name": "Postman Customer",
  "email": "customer@example.com",
  "password": "Password123!"
}
```

Log in:

```http
POST {{baseUrl}}/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```

Copy the `token` from the login response into the collection's `token` variable.

To test admin-only endpoints instead, log in with the seeded admin credentials and use the returned token.

### 3. Browse products

```http
GET {{baseUrl}}/api/v1/products
```

Optional query parameters include `page`, `limit`, `category`, `search`, and `sort` (`price_asc` or `price_desc`). Copy a product's `_id` into the `productId` variable for the cart request.

### 4. Add a product to the cart

```http
POST {{baseUrl}}/api/v1/cart/items
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "productId": "{{productId}}",
  "quantity": 1
}
```

Other cart requests:

- `GET {{baseUrl}}/api/v1/cart`
- `PATCH {{baseUrl}}/api/v1/cart/items/{{productId}}` with `{"quantity": 2}`
- `DELETE {{baseUrl}}/api/v1/cart/items/{{productId}}`

### 5. Create an order

```http
POST {{baseUrl}}/api/v1/orders
Authorization: Bearer {{token}}
```

The backend reads the authenticated customer's cart, checks current product prices and stock, calculates the total, and reserves stock. A successful response contains an order and a `sandboxPayment` placeholder.

Other order requests:

- `GET {{baseUrl}}/api/v1/orders` — list your orders
- `GET {{baseUrl}}/api/v1/orders/{{orderId}}` — view an order you own
- `POST {{baseUrl}}/api/v1/orders/{{orderId}}/cancel` — cancel an eligible pending order

### 6. Try compatibility and PC builds

Compatibility check (authentication is not required):

```http
POST {{baseUrl}}/api/v1/compatibility/check
Content-Type: application/json
```

```json
{
  "components": {
    "CPU": "CPU_PRODUCT_ID",
    "motherboard": "MOTHERBOARD_PRODUCT_ID",
    "RAM": "RAM_PRODUCT_ID",
    "PSU": "PSU_PRODUCT_ID",
    "case": "CASE_PRODUCT_ID"
  }
}
```

Build endpoints require a bearer token:

- `POST {{baseUrl}}/api/v1/builds/validate` with `{"components":{"CPU":"CPU_PRODUCT_ID","motherboard":"MOTHERBOARD_PRODUCT_ID"}}`
- `POST {{baseUrl}}/api/v1/builds` with `{"name":"My PC","components":{"CPU":"CPU_PRODUCT_ID"}}`
- `GET {{baseUrl}}/api/v1/builds`
- `POST {{baseUrl}}/api/v1/builds/BUILD_ID/cart`

### 7. Try the AI advisor

```http
POST {{baseUrl}}/api/v1/advisor/recommend
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "budget": 50000,
  "usage": "gaming"
}
```

Set `GEMINI_API_KEY` in `.env` and restart the API before testing. The advisor tries `gemini-3.5-flash`, then `gemini-3.6-flash`, then `gemini-3.8-flash`. If none respond, it returns a catalog-based recommendation instead of failing. A budget below the cheapest complete build returns a partial build with the minimum budget and the missing categories.

### 8. Try admin product management

Log in as the seeded admin and set the returned token as `{{token}}`. Create a product:

```http
POST {{baseUrl}}/api/v1/products
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "name": "Example AM5 CPU",
  "description": "Development test product",
  "category": "CPU",
  "price": 12995,
  "stock": 10,
  "specifications": {
    "socket": "AM5",
    "powerWatts": 65
  }
}
```

Admin product operations include `PATCH {{baseUrl}}/api/v1/products/PRODUCT_ID` and `DELETE {{baseUrl}}/api/v1/products/PRODUCT_ID` (deactivates the product).

## Payment webhook testing and limitations

The order endpoint currently returns a test payment reference; it does not create a PayMongo checkout session. To test the webhook handler locally, send raw JSON to:

```http
POST {{baseUrl}}/api/v1/payments/webhook
Content-Type: application/json
```

With `PAYMONGO_WEBHOOK_SECRET` unset and `NODE_ENV` not set to `production`, the development handler accepts unsigned events. For example:

```json
{
  "id": "evt_test_001",
  "type": "payment.paid",
  "data": {
    "attributes": {
      "metadata": {
        "orderId": "YOUR_ORDER_ID"
      }
    }
  }
}
```

Use a unique event `id` for each event. Re-sending the same event tests duplicate-event handling. Never run with unsigned webhook events in production. Real PayMongo sandbox checkout and signature verification require gateway configuration.

## Common responses

- `401 Unauthorized` — authentication is missing or invalid.
- `403 Forbidden` — the authenticated user lacks permission or does not own the requested resource.
- `422 Validation Error` — input is invalid or a coupon cannot be used.
- `409 Conflict` — product availability, stock, or a requested state transition conflicts.

## Automated checks

Run these from `backend/`:

```powershell
npm test
npm run docs:check
```

## MongoDB Atlas MCP Server

This project is configured to connect your AI client to your MongoDB Atlas cluster via the official [MongoDB MCP Server](https://www.mongodb.com/docs/mcp-server/).

### What was added

- **`.mcp.json`** — registers the `mongodb-atlas` MCP server, which runs the official `mongodb-mcp-server@latest` package (via `npx`) against your Atlas cluster in read-only mode.
- **`backend/.env`** — defines `MDB_MCP_CONNECTION_STRING` (kept in sync with `MONGODB_URI`).
- **`backend/.env.example`** — documents the `MDB_MCP_CONNECTION_STRING` placeholder.
- **`.gitignore`** — excludes `.env` and `.mcp.json` because they contain your Atlas connection-string password.

### Cluster

The configured cluster is the one at `https://cloud.mongodb.com/v2/6a0d4a196df7cd4f8b826ae4#/clusters` (connection string already present in `.env`).

### Using it

1. Make sure `backend/.env` contains `MDB_MCP_CONNECTION_STRING` pointing at your Atlas cluster (already set).
2. Restart your AI client (VS Code / Claude Code / Cursor) so it loads `.mcp.json`.
3. The MCP server is available as `mongodb-atlas` and exposes Atlas/cluster management tools (read-only by default).

### Security notes

- The connection string in `.env`/`.mcp.json` contains a password. These files are gitignored — do not commit them.
- For a more secure setup that avoids embedding the connection string, create Atlas service-account credentials (Project Access Manager → Service Accounts in Atlas) and set `MDB_MCP_API_CLIENT_ID` and `MDB_MCP_API_CLIENT_SECRET` instead of `MDB_MCP_CONNECTION_STRING`, per the [MongoDB MCP Server docs](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/methods/).
- To allow write operations, remove `--readOnly` from the `args` in `.mcp.json` (not recommended for shared/dev environments).
