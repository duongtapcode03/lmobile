import express from "express";
import { flashSaleController } from "./flashSale.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Public routes
router.get("/", flashSaleController.getAll);
router.get("/stats", flashSaleController.getStats);
router.get("/session/:sessionId", flashSaleController.getBySession);
router.get("/product/:productId/check", convertIdToNumber, flashSaleController.checkAvailability);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize("admin"));

router.post("/", flashSaleController.create);
router.put("/:id", convertIdToNumber, flashSaleController.update);
router.delete("/:id", convertIdToNumber, flashSaleController.delete);

export default router;

