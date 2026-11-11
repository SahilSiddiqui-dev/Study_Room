/**
 * Standard API response envelope helper
 * { success: true, data?, message? }
 */
const sendResponse = (res, statusCode, { data, message } = {}) => {
  const response = {
    success: true,
  };

  if (message !== undefined) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

module.exports = sendResponse;

