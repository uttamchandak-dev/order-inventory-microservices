# Order & Inventory Microservices

![CI](https://github.com/uttamchandak-dev/order-inventory-microservices/actions/workflows/ci.yml/badge.svg)

Two independent Node.js services — **orders-service** and **inventory-service** — each with its own MySQL database, communicating over REST. Demonstrates a microservices architecture with a saga-style compensating transaction: if an order can't be fully fulfilled, any stock already reserved for it is automatically released.

## Architecture

```
                POST /orders
                     |
                     v
              +---------------+          GET  /products/:sku
              | orders-service |-------->  POST /products/:sku/reserve
              |  (own MySQL)   |<--------  POST /products/:sku/release
              +---------------+
                     |
              writes order record
              (confirmed / failed)


              +------------------+
              | inventory-service |
              |    (own MySQL)    |
              +------------------+
```

- Each service owns its database — no shared schema, no cross-service SQL joins.
- `orders-service` never talks to `inventory-db` directly; all stock changes go through `inventory-service`'s HTTP API.
- Stock reservation is atomic at the SQL level (`UPDATE ... WHERE stock_qty >= ?`), so concurrent orders can't oversell.
- If an order needs multiple items and only some reservations succeed before one fails, `orders-service` compensates by calling `release` on everything it already reserved for that order — keeping inventory consistent without a distributed transaction.

## Tech Stack

Node.js · Express · MySQL (mysql2) · Docker Compose

## Getting Started

The whole stack (both services + both databases) runs with a single command:

```bash
docker compose up -d --build
```

- `inventory-service` → `http://localhost:4001` (seeds 3 sample products on first boot)
- `orders-service` → `http://localhost:4002`

Both services auto-create their schema on startup, so there's no separate migration step for the Docker flow.

To run a service locally instead (e.g. for development), `cd` into it, `cp .env.example .env`, point `DB_HOST` at a running MySQL instance, then `npm install && npm start`.

## API Reference

### inventory-service (`:4001`)

| Method | Endpoint                    | Description                          |
|--------|------------------------------|----------------------------------------|
| GET    | `/products`                  | List all products                     |
| GET    | `/products/:sku`             | Get one product                       |
| POST   | `/products/:sku/reserve`     | Atomically decrement stock (`{quantity}`) |
| POST   | `/products/:sku/release`     | Increment stock back (`{quantity}`)   |

### orders-service (`:4002`)

| Method | Endpoint              | Description                                      |
|--------|------------------------|---------------------------------------------------|
| POST   | `/orders`               | Create an order; reserves stock via inventory-service |
| GET    | `/orders`                | List all orders                                   |
| GET    | `/orders/:orderNumber`   | Get one order                                      |

## Example: full flow

```bash
# See what's in stock
curl -s http://localhost:4001/products

# Place an order for two products
curl -s -X POST http://localhost:4002/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Acme Corp",
    "items": [
      {"sku": "SKU-WIDGET-1", "quantity": 3},
      {"sku": "SKU-GIZMO-3", "quantity": 5}
    ]
  }'
# => { "orderNumber": "ord_...", "status": "confirmed", "total": 109.92 }

# Stock is now reduced accordingly
curl -s http://localhost:4001/products
```

### Compensation example

Ordering more than is in stock for the *second* item in a multi-item order causes the whole order to fail, and any earlier reservation in that order is released:

```bash
curl -s -X POST http://localhost:4002/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Big Buyer",
    "items": [
      {"sku": "SKU-WIDGET-1", "quantity": 1},
      {"sku": "SKU-GADGET-2", "quantity": 9999}
    ]
  }'
# => { "orderNumber": "ord_...", "status": "failed", "reason": "Could not reserve 9999x SKU-GADGET-2 (insufficient_stock)" }

# SKU-WIDGET-1 stock is unchanged — the 1-unit reservation was rolled back
curl -s http://localhost:4001/products
```

## Testing

Both services have a black-box integration test suite that runs against the live stack:

```bash
docker compose up -d --build

cd inventory-service && npm install && npm test && cd ..
cd orders-service && npm install && npm test && cd ..
```

The `orders-service` suite specifically verifies the compensation path (a multi-item order that partially reserves stock before failing releases everything it already reserved). CI runs the same suite on every push via GitHub Actions.

## Design Notes

- No message queue / event bus is used — service-to-service calls are synchronous REST for simplicity. A production version handling higher throughput would likely move reservation to an async event-driven saga (e.g. via a queue) to avoid holding an HTTP connection open across the whole flow.
- Reservation failures are handled with explicit compensation rather than a two-phase commit, since 2PC across independently-owned databases isn't practical in a microservices setup.
