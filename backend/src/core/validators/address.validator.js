import { body, param } from 'express-validator';

export const addressValidators = {
  create: [
    body('fullName')
      .notEmpty().withMessage('Họ tên là bắt buộc')
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('phone')
      .notEmpty().withMessage('Số điện thoại là bắt buộc')
      .matches(/^[0-9]{8,11}$/).withMessage('Số điện thoại phải có 8-11 chữ số')
      .custom((value) => {
        // Cho phép số điện thoại Việt Nam: bắt đầu bằng 0 (10-11 chữ số)
        if (value.startsWith('0') && value.length >= 10) {
          return true;
        }
        // Cho phép số điện thoại quốc tế hoặc số test (8-11 chữ số, không bắt đầu bằng 0)
        if (/^[1-9][0-9]{7,10}$/.test(value)) {
          return true;
        }
        throw new Error('Số điện thoại không hợp lệ');
      }),
    
    body('address')
      .notEmpty().withMessage('Địa chỉ là bắt buộc')
      .isLength({ max: 200 }).withMessage('Địa chỉ không được quá 200 ký tự'),
    
    body('ward')
      .notEmpty().withMessage('Phường/Xã là bắt buộc')
      .isLength({ max: 50 }).withMessage('Phường/Xã không được quá 50 ký tự'),
    
    body('district')
      .notEmpty().withMessage('Quận/Huyện là bắt buộc')
      .isLength({ max: 50 }).withMessage('Quận/Huyện không được quá 50 ký tự'),
    
    body('province')
      .notEmpty().withMessage('Tỉnh/Thành phố là bắt buộc')
      .isLength({ max: 50 }).withMessage('Tỉnh/Thành phố không được quá 50 ký tự'),
    
    body('email')
      .optional()
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),
    
    body('label')
      .optional()
      .isIn(['home', 'work', 'other', '']).withMessage('Label không hợp lệ'),
  ],

  update: [
    param('id').isMongoId().withMessage('ID không hợp lệ'),
    
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự'),
    
    body('phone')
      .optional()
      .matches(/^[0-9]{8,11}$/).withMessage('Số điện thoại phải có 8-11 chữ số')
      .custom((value) => {
        if (!value) return true; // Optional field
        // Cho phép số điện thoại Việt Nam: bắt đầu bằng 0 (10-11 chữ số)
        if (value.startsWith('0') && value.length >= 10) {
          return true;
        }
        // Cho phép số điện thoại quốc tế hoặc số test (8-11 chữ số, không bắt đầu bằng 0)
        if (/^[1-9][0-9]{7,10}$/.test(value)) {
          return true;
        }
        throw new Error('Số điện thoại không hợp lệ');
      }),
    
    body('address')
      .optional()
      .isLength({ max: 200 }).withMessage('Địa chỉ không được quá 200 ký tự'),
  ],

  getById: [
    param('id').isMongoId().withMessage('ID không hợp lệ')
  ]
};

