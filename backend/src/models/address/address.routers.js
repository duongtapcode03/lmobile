import express from "express";
import { addressController } from "./address.controller.js";
import { protect } from "../../core/middleware/auth.middleware.js";
import { addressValidators } from "../../core/validators/address.validator.js";
import { validate } from "../../core/validators/validator.js";

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(protect);

// Address routes
router.get("/", addressController.getAll);
router.get("/default", addressController.getDefault);
router.post("/", 
  addressValidators.create, 
  validate, 
  addressController.create
);
router.get("/:id", 
  addressValidators.getById, 
  validate, 
  addressController.getById
);
router.put("/:id", 
  addressValidators.update, 
  validate, 
  addressController.update
);
router.delete("/:id", 
  addressValidators.getById, 
  validate, 
  addressController.delete
);
router.put("/:id/default", 
  addressValidators.getById, 
  validate, 
  addressController.setDefault
);

export default router;

