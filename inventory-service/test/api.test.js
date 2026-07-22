// Black-box integration tests against a running inventory-service container.
// Run `docker compose up -d --build` from the repo root first.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.INVENTORY_BASE_URL || "http://localhost:4001";

test("GET /health returns ok", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("GET /products returns the seeded catalog", async () => {
  const res = await fetch(`${BASE}/products`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.length >= 3);
  assert.ok(body.some((p) => p.sku === "SKU-WIDGET-1"));
});

test("GET /products/:sku returns 404 for an unknown SKU", async () => {
  const res = await fetch(`${BASE}/products/SKU-DOES-NOT-EXIST`);
  assert.equal(res.status, 404);
});

test("reserve decrements stock, release increments it back", async () => {
  const before = await (await fetch(`${BASE}/products/SKU-GIZMO-3`)).json();
  const startStock = before.stock_qty;

  const reserve = await fetch(`${BASE}/products/SKU-GIZMO-3/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: 2 }),
  });
  assert.equal(reserve.status, 200);

  const afterReserve = await (await fetch(`${BASE}/products/SKU-GIZMO-3`)).json();
  assert.equal(afterReserve.stock_qty, startStock - 2);

  const release = await fetch(`${BASE}/products/SKU-GIZMO-3/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: 2 }),
  });
  assert.equal(release.status, 200);

  const afterRelease = await (await fetch(`${BASE}/products/SKU-GIZMO-3`)).json();
  assert.equal(afterRelease.stock_qty, startStock);
});

test("reserve fails with 409 when quantity exceeds stock", async () => {
  const res = await fetch(`${BASE}/products/SKU-GIZMO-3/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: 999999 }),
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.ok(body.available !== undefined);
});

test("reserve rejects a non-positive-integer quantity", async () => {
  const res = await fetch(`${BASE}/products/SKU-GIZMO-3/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: -1 }),
  });
  assert.equal(res.status, 400);
});

test("reserve on an unknown SKU returns 404", async () => {
  const res = await fetch(`${BASE}/products/SKU-NOPE/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: 1 }),
  });
  assert.equal(res.status, 404);
});
