import { body, param, query } from 'express-validator';

export const productValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Tên sản phẩm là bắt buộc')
      .isLength({ min: 3, max: 200 }).withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
    
    body('price')
      .notEmpty().withMessage('Giá là bắt buộc')
      .isString().withMessage('Giá phải là chuỗi'),
    
    body('brandRef')
      .notEmpty().withMessage('brandRef là bắt buộc')
      .isMongoId().withMessage('brandRef phải là ObjectId hợp lệ'),
    
    body('categoryRefs')
      .optional()
      .isArray().withMessage('categoryRefs phải là mảng')
      .custom((value) => {
        if (!value || value.length === 0) return true; // Optional, nhưng nếu có thì phải là array hợp lệ
        if (!Array.isArray(value)) return false;
        return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }).withMessage('categoryRefs phải chứa ObjectId hợp lệ'),
    
    body('sku')
      .optional()
      .isAlphanumeric().withMessage('SKU chỉ được chứa chữ và số'),
    
    body('description')
      .optional()
      .isLength({ max: 5000 }).withMessage('Mô tả không được quá 5000 ký tự'),
  ],

  update: [
    param('id').isMongoId().withMessage('ID không hợp lệ'),
    
    body('name')
      .optional()
      .isLength({ min: 3, max: 200 }).withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
    
    body('price')
      .optional()
      .isString().withMessage('Giá phải là chuỗi'),
    
    body('brandRef')
      .optional()
      .isMongoId().withMessage('brandRef phải là ObjectId hợp lệ'),
    
    body('categoryRefs')
      .optional()
      .isArray().withMessage('categoryRefs phải là mảng')
      .custom((value) => {
        if (!value || value.length === 0) return true;
        if (!Array.isArray(value)) return false;
        return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }).withMessage('categoryRefs phải chứa ObjectId hợp lệ'),
  ],

  getById: [
    param('id').isMongoId().withMessage('ID không hợp lệ')
  ],

  getBySlug: [
    param('slug').notEmpty().withMessage('Slug là bắt buộc')
  ],

  getAll: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),
    query('category').optional().isMongoId().withMessage('ID danh mục không hợp lệ'),
    query('brand').optional().custom((value) => {
      // Brand can be either ObjectId or name string (service will handle conversion)
      if (typeof value === 'string') {
        return true;
      }
      return false;
    }).withMessage('Brand phải là ObjectId hoặc tên thương hiệu'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice phải là số dương'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice phải là số dương'),
    query('isActive').optional().isBoolean().withMessage('isActive phải là boolean'),
    query('isFeatured').optional().isBoolean().withMessage('isFeatured phải là boolean'),
    query('sortBy').optional().isString().withMessage('Sắp xếp theo phải là chuỗi'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Thứ tự sắp xếp không hợp lệ (asc/desc)'),
  ]
};

