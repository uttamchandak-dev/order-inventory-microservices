const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

router.get("/", productController.list);
router.get("/:sku", productController.getBySku);
router.post("/:sku/reserve", productController.reserve);
router.post("/:sku/release", productController.release);

module.exports = router;
