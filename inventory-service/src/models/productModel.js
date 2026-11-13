const pool = require("../config/db");

async function findAll() {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY id");
  return rows;
}

async function findBySku(sku) {
  const [rows] = await pool.query("SELECT * FROM products WHERE sku = ?", [sku]);
  return rows[0] || null;
}

// Atomically reserves stock: only decrements if enough stock is available.
// Returns true if the reservation succeeded, false if there wasn't enough stock.
async function reserveStock(sku, quantity) {
  const [result] = await pool.query(
    "UPDATE products SET stock_qty = stock_qty - ? WHERE sku = ? AND stock_qty >= ?",
    [quantity, sku, quantity]
  );
  return result.affectedRows === 1;
}

async function releaseStock(sku, quantity) {
  await pool.query("UPDATE products SET stock_qty = stock_qty + ? WHERE sku = ?", [quantity, sku]);
}

module.exports = { findAll, findBySku, reserveStock, releaseStock };
