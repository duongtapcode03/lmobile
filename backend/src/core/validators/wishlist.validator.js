import { param, body } from 'express-validator';
import mongoose from 'mongoose';

// Custom validator để chấp nhận cả MongoDB ObjectId và SKU (string)
const validateProductId = (value) => {
  // Chấp nhận MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(value)) {
    return true;
  }
  // Chấp nhận SKU (string không rỗng, có thể chứa chữ, số, dấu gạch dưới, dấu gạch ngang)
  if (typeof value === 'string' && value.trim().length > 0) {
    // SKU có thể chứa: chữ, số, dấu gạch dưới, dấu gạch ngang
    const skuPattern = /^[a-zA-Z0-9_-]+$/;
    if (skuPattern.test(value.trim())) {
      return true;
    }
  }
  return false;
};

export const wishlistValidators = {
  addProduct: [
    param('productId')
      .custom(validateProductId)
      .withMessage('Product ID không hợp lệ (phải là MongoDB ObjectId hoặc SKU)'),
    
    body('note')
      .optional()
      .isLength({ max: 200 }).withMessage('Ghi chú không được quá 200 ký tự'),
  ],

  removeProduct: [
    param('productId')
      .custom(validateProductId)
      .withMessage('Product ID không hợp lệ (phải là MongoDB ObjectId hoặc SKU)')
  ],

  checkProduct: [
    param('productId')
      .custom(validateProductId)
      .withMessage('Product ID không hợp lệ (phải là MongoDB ObjectId hoặc SKU)')
  ],

  togglePublic: [
    body('isPublic')
      .notEmpty().withMessage('isPublic là bắt buộc')
      .isBoolean().withMessage('isPublic phải là boolean')
  ]
};

