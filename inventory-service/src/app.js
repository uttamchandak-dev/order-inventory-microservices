const express = require("express");
const productRoutes = require("./routes/productRoutes");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "inventory-service" }));
app.use("/products", productRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
