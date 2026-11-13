// Black-box integration tests against a running orders-service + inventory-service stack.
// Run `docker compose up -d --build` from the repo root first.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const ORDERS_BASE = process.env.ORDERS_BASE_URL || "http://localhost:4002";
const INVENTORY_BASE = process.env.INVENTORY_BASE_URL || "http://localhost:4001";

async function getStock(sku) {
  const res = await fetch(`${INVENTORY_BASE}/products/${sku}`);
  const body = await res.json();
  return body.stock_qty;
}

test("GET /health returns ok", async () => {
  const res = await fetch(`${ORDERS_BASE}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("rejects an order with no items", async () => {
  const res = await fetch(`${ORDERS_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: "Nobody", items: [] }),
  });
  assert.equal(res.status, 400);
});

test("confirms a valid order and debits stock", async () => {
  const startStock = await getStock("SKU-WIDGET-1");

  const res = await fetch(`${ORDERS_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Test Customer",
      items: [{ sku: "SKU-WIDGET-1", quantity: 2 }],
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, "confirmed");
  assert.ok(body.orderNumber);

  const endStock = await getStock("SKU-WIDGET-1");
  assert.equal(endStock, startStock - 2);

  const fetched = await fetch(`${ORDERS_BASE}/orders/${body.orderNumber}`);
  assert.equal(fetched.status, 200);
  const order = await fetched.json();
  assert.equal(order.status, "confirmed");
});

test("fails an order for an unknown SKU without touching inventory", async () => {
  const res = await fetch(`${ORDERS_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Test Customer",
      items: [{ sku: "SKU-NOPE", quantity: 1 }],
    }),
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.status, "failed");
});

test("compensates already-reserved items when a later item in the order fails", async () => {
  const startWidgetStock = await getStock("SKU-WIDGET-1");

  const res = await fetch(`${ORDERS_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Big Buyer",
      items: [
        { sku: "SKU-WIDGET-1", quantity: 1 },
        { sku: "SKU-GADGET-2", quantity: 999999 },
      ],
    }),
  });
  assert.equal(res.status, 409);

  const endWidgetStock = await getStock("SKU-WIDGET-1");
  assert.equal(endWidgetStock, startWidgetStock, "widget reservation should have been released");
});

test("GET /orders lists created orders", async () => {
  const res = await fetch(`${ORDERS_BASE}/orders`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length >= 1);
});
