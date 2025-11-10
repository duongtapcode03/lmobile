import { body, param } from 'express-validator';

export const userValidators = {
  register: [
    body('name')
      .notEmpty().withMessage('Tên là bắt buộc')
      .isLength({ min: 2, max: 100 }).withMessage('Tên phải từ 2-100 ký tự'),
    
    body('email')
      .notEmpty().withMessage('Email là bắt buộc')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Mật khẩu là bắt buộc')
      .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    
    body('phone')
      .optional()
      .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
  ],

  login: [
    body('email')
      .notEmpty().withMessage('Email là bắt buộc')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Mật khẩu là bắt buộc'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
    
    body('newPassword')
      .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
      .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
  ],

  updateProfile: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Tên phải từ 2-100 ký tự'),
    
    body('phone')
      .optional()
      .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
    
    body('email')
      .optional()
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),
  ]
};

