const express = require("express");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const logger = require("./config/logger");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
app.use(helmet());
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== "test" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "orders-service" }));
app.use("/orders", orderRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  (req.log || console).error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
