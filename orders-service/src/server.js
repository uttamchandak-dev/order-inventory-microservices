require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 4002;

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "config", "schema.sql"), "utf8");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function start(retries = 15) {
  try {
    await ensureSchema();
  } catch (err) {
    if (retries > 0) {
      console.log("Waiting for database...", err.message);
      setTimeout(() => start(retries - 1), 2000);
      return;
    }
    throw err;
  }

  app.listen(PORT, () => console.log(`orders-service listening on port ${PORT}`));
}

start();
