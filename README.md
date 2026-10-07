# SK Mobiles, Accessories & Services

A React storefront and NestJS REST API in an npm-workspaces monorepo. Product, repair, offer, customer and order data is stored in MySQL; the client keeps only the shopping cart and signed-in session token in browser storage.

## Project Layout

```text
client/                 React 19 + TypeScript + Vite storefront
  src/App.tsx           Storefront and API-connected customer/admin flows
  src/api.ts            Axios API client
  src/styles.css        Existing storefront visual system
  src/overrides.css     React-specific layout and interaction styles
server/                 NestJS REST API
  src/database/entities.ts  TypeORM SQL table models
  src/auth/             Customer register/login
  src/catalog/          Products, categories and active offers
  src/repairs/          Repair booking, tracking and admin status changes
  src/orders/           Checkout, customer order lookup and admin management
  sql/schema.sql        MySQL schema
  sql/seed.sql          Starter services, products and FIX10 offer
render.yaml             Render static site and web service blueprint
```

## Requirements

- Node.js 22 or newer and npm
- A MySQL 8-compatible database endpoint. Render does not provide MySQL in its free service; use an external provider that offers a compatible plan and endpoint.

## Database Setup

Create a database with your provider, then import the schema and starter data using that provider's MySQL client or console:

```sh
mysql --host=DB_HOST --user=DB_USER --password DB_NAME < server/sql/schema.sql
mysql --host=DB_HOST --user=DB_USER --password DB_NAME < server/sql/seed.sql
```

The schema and TypeORM entity models are kept explicit. Runtime schema synchronization is disabled so application startup never silently changes production tables.

## Local Development

1. Install workspace dependencies: `npm install`
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET`, and `ADMIN_API_KEY`.
3. Copy `client/.env.example` to `client/.env`. Set `VITE_API_URL=http://localhost:3000/api` for local API access.
4. Start the Vite client and NestJS API together: `npm run dev`
5. Open the Vite URL printed by the client, normally `http://localhost:5173`.

Run a production build with `npm run build` and strict TypeScript checks with `npm run typecheck`.

## API

- `GET /api/health`
- `GET /api/products`, `GET /api/categories`, `GET /api/offers`, `GET /api/reviews` (approved reviews only)
- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/repairs`, `GET /api/repairs/track?repairId=...&phone=...`
- `POST /api/orders`, `GET /api/orders` (requires `Authorization: Bearer <accessToken>`)
- `GET /api/admin/repairs`, `PATCH /api/admin/repairs/:repairCode`
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:orderNumber`

Admin routes require `x-admin-key: <ADMIN_API_KEY>`. Keep this value server-side; the admin form asks the operator for it at runtime and does not persist it. Customer order history is tied to the user ID in the verified JWT, not a phone-number lookup.

## Render Deployment

The root `render.yaml` creates a free Render static site and free Node web service. Import the repository as a Blueprint, provide the external MySQL connection string as `DATABASE_URL`, and import `schema.sql` and `seed.sql` into that database before using the site. The blueprint enables database TLS, generates JWT/admin secrets, and points the client at the API service.

Free web services can sleep when idle, so the first API request after inactivity may take longer. Free-plan availability and limits vary by provider and can change; check current database-provider terms before relying on a free tier.

## Scope Notes

Repair booking/tracking, product browsing, cart checkout, customer registration/login, and admin repair/order status workflows are wired to the API. Checkout currently creates a cash-on-delivery order; no payment gateway, email/SMS/WhatsApp delivery, invoice PDF, password reset, or technician portal is configured. Those integrations require provider credentials and deployment-specific security configuration.