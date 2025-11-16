/**
 * Middleware to convert ID parameter from string to number
 * Tự động convert ID từ string sang number cho các routes có :id parameter
 */

export const convertIdToNumber = (req, res, next) => {
  // Convert ID parameter if exists
  if (req.params.id) {
    const id = req.params.id;
    // Try to convert to number
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      req.params.id = numericId;
    }
    // If conversion fails, keep original value (let service handle it)
  }

  // Convert other ID parameters (productId, categoryId, etc.)
  // Note: userId, orderId, authorId, blogId use ObjectId, not Number, so don't convert them
  const idParams = ['productId', 'categoryId', 'brandId', 'parentId', 'itemId'];
  idParams.forEach(param => {
    if (req.params[param]) {
      const numericId = parseInt(req.params[param], 10);
      if (!isNaN(numericId)) {
        req.params[param] = numericId;
      }
    }
  });

  // Also convert ID in query params if needed
  if (req.query.id) {
    const numericId = parseInt(req.query.id, 10);
    if (!isNaN(numericId)) {
      req.query.id = numericId;
    }
  }

  next();
};

