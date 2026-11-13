const pool = require("../config/db");
const crypto = require("crypto");

function generateOrderNumber() {
  return `ord_${crypto.randomBytes(8).toString("hex")}`;
}

async function createOrder({ customerName, items, totalCents, status, failureReason }) {
  const orderNumber = generateOrderNumber();
  await pool.query(
    `INSERT INTO orders (order_number, customer_name, items, total_cents, status, failure_reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [orderNumber, customerName, JSON.stringify(items), totalCents, status, failureReason || null]
  );
  return orderNumber;
}

async function findAll() {
  const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows;
}

async function findByOrderNumber(orderNumber) {
  const [rows] = await pool.query("SELECT * FROM orders WHERE order_number = ?", [orderNumber]);
  return rows[0] || null;
}

module.exports = { createOrder, findAll, findByOrderNumber, generateOrderNumber };
