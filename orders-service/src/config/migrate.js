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
  console.log("Migration complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
