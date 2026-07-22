const express = require("express");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.post("/", orderController.create);
router.get("/", orderController.list);
router.get("/:orderNumber", orderController.getByOrderNumber);

module.exports = router;
