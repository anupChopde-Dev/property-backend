/**
 * Send a successful JSON response
 */
export const sendSuccess = (res, data, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a paginated response
 */
export const sendPaginated = (res, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
};

/**
 * Send an error response
 */
export const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
