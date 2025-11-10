import { param, body } from 'express-validator';

export const wishlistValidators = {
  addProduct: [
    param('productId').isMongoId().withMessage('Product ID không hợp lệ'),
    
    body('note')
      .optional()
      .isLength({ max: 200 }).withMessage('Ghi chú không được quá 200 ký tự'),
  ],

  removeProduct: [
    param('productId').isMongoId().withMessage('Product ID không hợp lệ')
  ],

  checkProduct: [
    param('productId').isMongoId().withMessage('Product ID không hợp lệ')
  ],

  togglePublic: [
    body('isPublic')
      .notEmpty().withMessage('isPublic là bắt buộc')
      .isBoolean().withMessage('isPublic phải là boolean')
  ]
};

