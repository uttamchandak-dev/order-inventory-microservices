const BASE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:4001";

async function getProduct(sku) {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(sku)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`inventory-service error fetching ${sku}: ${res.status}`);
  return res.json();
}

async function reserveStock(sku, quantity) {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(sku)}/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (res.status === 409) return { ok: false, reason: "insufficient_stock" };
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (!res.ok) throw new Error(`inventory-service error reserving ${sku}: ${res.status}`);
  return { ok: true };
}

async function releaseStock(sku, quantity) {
  const res = await fetch(`${BASE_URL}/products/${encodeURIComponent(sku)}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error(`inventory-service error releasing ${sku}: ${res.status}`);
}

module.exports = { getProduct, reserveStock, releaseStock };
