import { validationResult } from 'express-validator';

/**
 * Validation middleware - checks for validation errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation errors for debugging
    console.log('[Validation Error]', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
      body: req.body
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

