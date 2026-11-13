const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "inventory_user",
  password: process.env.DB_PASSWORD || "inventory_pass",
  database: process.env.DB_NAME || "inventory_db",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
