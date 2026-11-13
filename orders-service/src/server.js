require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./config/db");
const app = require("./app");
const logger = require("./config/logger");

const PORT = process.env.PORT || 4002;

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "config", "schema.sql"), "utf8");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

let server;

async function start(retries = 15) {
  try {
    await ensureSchema();
  } catch (err) {
    if (retries > 0) {
      logger.info(`Waiting for database... (${err.message})`);
      setTimeout(() => start(retries - 1), 2000);
      return;
    }
    throw err;
  }

  server = app.listen(PORT, () => logger.info(`orders-service listening on port ${PORT}`));
}

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await pool.end();
      logger.info("Shutdown complete");
      process.exit(0);
    });
  } else {
    await pool.end();
    process.exit(0);
  }
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
