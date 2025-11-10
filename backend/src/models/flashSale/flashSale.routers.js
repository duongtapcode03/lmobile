import express from "express";
import { flashSaleController } from "./flashSale.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", flashSaleController.getAll);
router.get("/active", flashSaleController.getActive);
router.get("/upcoming", flashSaleController.getUpcoming);
router.get("/stats", flashSaleController.getStats);
router.get("/slug/:slug", flashSaleController.getBySlug);
router.get("/:id", flashSaleController.getById);

// Protected routes (Admin only)
router.use(protect);

router.post("/",
  authorize("admin"),
  flashSaleController.create
);

router.put("/:id",
  authorize("admin"),
  flashSaleController.update
);

router.delete("/:id",
  authorize("admin"),
  flashSaleController.delete
);

export default router;









