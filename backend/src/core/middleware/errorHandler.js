import logger from '../../config/logger.js';
import { AppError } from '../errors/AppError.js';

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    err.statusCode = 400;
    err.message = errors.join(', ');
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'ID không hợp lệ';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    err.statusCode = 400;
    err.message = `${field} đã tồn tại`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Token không hợp lệ';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token đã hết hạn';
  }

  // Log error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode
  });

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production: don't leak error details
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.isOperational ? err.message : 'Có lỗi xảy ra, vui lòng thử lại sau'
    });
  }
};

/**
 * Async handler wrapper to catch errors
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

