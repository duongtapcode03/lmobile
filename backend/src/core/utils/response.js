/**
 * Standardized API Response Utilities
 */

export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
};

export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  res.json({
    success: true,
    message,
    data,
    pagination
  });
};

export const createdResponse = (res, data, message = 'Created successfully') => {
  successResponse(res, data, message, 201);
};

export const notFoundResponse = (res, message = 'Resource not found') => {
  errorResponse(res, message, 404);
};

export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  errorResponse(res, message, 401);
};

export const forbiddenResponse = (res, message = 'Forbidden') => {
  errorResponse(res, message, 403);
};

