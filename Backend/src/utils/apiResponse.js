/**
 * Standard success response shape (per project spec):
 * { success: true, message: string, data: object }
 */
export const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard error response shape (per project spec):
 * { success: false, message: string, error: object }
 */
export const sendError = (res, statusCode, message, error = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};
