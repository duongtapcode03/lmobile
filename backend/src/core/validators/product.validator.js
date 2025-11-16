import { body, param, query } from 'express-validator';

export const productValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Tên sản phẩm là bắt buộc')
      .isLength({ min: 3, max: 200 }).withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
    
    body('price')
      .optional()
      .custom((value) => {
        // Skip if empty/undefined/null
        if (value === undefined || value === null || value === '') return true;
        // Accept both string and number
        return typeof value === 'string' || typeof value === 'number';
      })
      .withMessage('Giá phải là chuỗi hoặc số'),
    
    body('priceNumber')
      .optional()
      .custom((value) => {
        // Accept number or numeric string, must be > 0
        if (value === undefined || value === null) return true;
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        return !isNaN(numValue) && numValue > 0;
      })
      .withMessage('priceNumber phải là số dương'),
    
    body('brandRef')
      .notEmpty().withMessage('brandRef là bắt buộc')
      .custom((value) => {
        // Accept both number and ObjectId string
        if (typeof value === 'number' || !isNaN(Number(value))) {
          return true;
        }
        // Also accept ObjectId format for backward compatibility
        return /^[0-9a-fA-F]{24}$/.test(value);
      })
      .withMessage('brandRef phải là số hoặc ObjectId hợp lệ'),
    
    body('categoryRefs')
      .optional()
      .isArray().withMessage('categoryRefs phải là mảng')
      .custom((value) => {
        if (!value || value.length === 0) return true; // Optional, nhưng nếu có thì phải là array hợp lệ
        if (!Array.isArray(value)) return false;
        // Accept both numbers and ObjectId strings
        return value.every(id => {
          if (typeof id === 'number' || !isNaN(Number(id))) {
            return true;
          }
          return /^[0-9a-fA-F]{24}$/.test(id);
        });
      }).withMessage('categoryRefs phải chứa số hoặc ObjectId hợp lệ'),
    
    body('sku')
      .optional()
      .custom((value) => {
        if (!value) return true; // Optional, skip if empty
        // Allow alphanumeric with hyphens and underscores (e.g., "IPHONE-17-PRO-MAX")
        return /^[a-zA-Z0-9_-]+$/.test(value);
      })
      .withMessage('SKU chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới'),
    
    body('description')
      .optional()
      .isLength({ max: 5000 }).withMessage('Mô tả không được quá 5000 ký tự'),
  ],

  update: [
    param('id')
      .custom((value) => {
        // Accept both number and ObjectId string
        if (typeof value === 'number' || !isNaN(Number(value))) {
          return true;
        }
        // Also accept ObjectId format for backward compatibility
        return /^[0-9a-fA-F]{24}$/.test(value);
      })
      .withMessage('ID không hợp lệ'),
    
    body('name')
      .optional()
      .notEmpty().withMessage('Tên sản phẩm không được để trống')
      .isLength({ min: 3, max: 200 }).withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
    
    body('price')
      .optional()
      .custom((value) => {
        // Skip if empty/undefined/null
        if (value === undefined || value === null || value === '') return true;
        // Accept both string and number
        return typeof value === 'string' || typeof value === 'number';
      })
      .withMessage('Giá phải là chuỗi hoặc số'),
    
    body('priceNumber')
      .optional()
      .custom((value) => {
        // Accept number or numeric string, must be > 0
        if (value === undefined || value === null) return true;
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        return !isNaN(numValue) && numValue > 0;
      })
      .withMessage('priceNumber phải là số dương'),
    
    body('brandRef')
      .optional()
      .custom((value) => {
        // Accept both number and ObjectId string
        if (typeof value === 'number' || !isNaN(Number(value))) {
          return true;
        }
        // Also accept ObjectId format for backward compatibility
        return /^[0-9a-fA-F]{24}$/.test(value);
      })
      .withMessage('brandRef phải là số hoặc ObjectId hợp lệ'),
    
    body('categoryRefs')
      .optional()
      .isArray().withMessage('categoryRefs phải là mảng')
      .custom((value) => {
        if (!value || value.length === 0) return true;
        if (!Array.isArray(value)) return false;
        // Accept both numbers and ObjectId strings
        return value.every(id => {
          if (typeof id === 'number' || !isNaN(Number(id))) {
            return true;
          }
          return /^[0-9a-fA-F]{24}$/.test(id);
        });
      }).withMessage('categoryRefs phải chứa số hoặc ObjectId hợp lệ'),
  ],

  getById: [
    param('id')
      .custom((value) => {
        // Accept both number and ObjectId string
        if (typeof value === 'number' || !isNaN(Number(value))) {
          return true;
        }
        // Also accept ObjectId format for backward compatibility
        return /^[0-9a-fA-F]{24}$/.test(value);
      })
      .withMessage('ID không hợp lệ')
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

