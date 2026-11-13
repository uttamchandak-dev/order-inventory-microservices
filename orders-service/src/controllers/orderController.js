const orderModel = require("../models/orderModel");
const inventoryClient = require("../services/inventoryClient");

// Coordinates order creation across the two services using a simple saga:
// reserve stock for each line item in turn; if any reservation fails,
// compensate by releasing everything already reserved for this order.
async function create(req, res, next) {
  try {
    const { customerName, items } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "customerName and a non-empty items array are required" });
    }
    for (const item of items) {
      if (!item.sku || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: "each item needs a sku and a positive integer quantity" });
      }
    }

    const reserved = [];
    let totalCents = 0;

    for (const item of items) {
      const product = await inventoryClient.getProduct(item.sku);
      if (!product) {
        await compensate(reserved);
        const orderNumber = await orderModel.createOrder({
          customerName, items, totalCents: 0, status: "failed",
          failureReason: `Unknown SKU: ${item.sku}`,
        });
        return res.status(409).json({ orderNumber, status: "failed", reason: `Unknown SKU: ${item.sku}` });
      }

      const result = await inventoryClient.reserveStock(item.sku, item.quantity);
      if (!result.ok) {
        await compensate(reserved);
        const orderNumber = await orderModel.createOrder({
          customerName, items, totalCents: 0, status: "failed",
          failureReason: `Could not reserve ${item.quantity}x ${item.sku} (${result.reason})`,
        });
        return res.status(409).json({
          orderNumber, status: "failed",
          reason: `Could not reserve ${item.quantity}x ${item.sku} (${result.reason})`,
        });
      }

      reserved.push(item);
      totalCents += product.price_cents * item.quantity;
    }

    const orderNumber = await orderModel.createOrder({
      customerName, items, totalCents, status: "confirmed",
    });

    res.status(201).json({ orderNumber, status: "confirmed", total: totalCents / 100 });
  } catch (err) {
    next(err);
  }
}

async function compensate(reservedItems) {
  for (const item of reservedItems) {
    try {
      await inventoryClient.releaseStock(item.sku, item.quantity);
    } catch (err) {
      console.error(`Failed to release stock for ${item.sku}:`, err.message);
    }
  }
}

async function list(req, res, next) {
  try {
    res.json(await orderModel.findAll());
  } catch (err) {
    next(err);
  }
}

async function getByOrderNumber(req, res, next) {
  try {
    const order = await orderModel.findByOrderNumber(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getByOrderNumber };
