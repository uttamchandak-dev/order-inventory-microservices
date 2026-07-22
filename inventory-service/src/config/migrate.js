require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }

  const seed = [
    ["SKU-WIDGET-1", "Standard Widget", 1999, 50],
    ["SKU-GADGET-2", "Deluxe Gadget", 4999, 20],
    ["SKU-GIZMO-3", "Pocket Gizmo", 999, 100],
  ];
  for (const [sku, name, price, qty] of seed) {
    await pool.query(
      `INSERT INTO products (sku, name, price_cents, stock_qty) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [sku, name, price, qty]
    );
  }

  console.log("Migration + seed complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
