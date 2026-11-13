const productModel = require("../models/productModel");

async function list(req, res, next) {
  try {
    res.json(await productModel.findAll());
  } catch (err) {
    next(err);
  }
}

async function getBySku(req, res, next) {
  try {
    const product = await productModel.findBySku(req.params.sku);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function reserve(req, res, next) {
  try {
    const { quantity } = req.body;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const product = await productModel.findBySku(req.params.sku);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const reserved = await productModel.reserveStock(req.params.sku, quantity);
    if (!reserved) {
      return res.status(409).json({ error: "Insufficient stock", available: product.stock_qty });
    }

    res.json({ sku: req.params.sku, reserved: quantity });
  } catch (err) {
    next(err);
  }
}

async function release(req, res, next) {
  try {
    const { quantity } = req.body;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const product = await productModel.findBySku(req.params.sku);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await productModel.releaseStock(req.params.sku, quantity);
    res.json({ sku: req.params.sku, released: quantity });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySku, reserve, release };
