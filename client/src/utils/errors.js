/**
 * Extract human-readable error messages and field validation errors from Axios/server responses.
 * Backend responds with:
 * { success: false, message: string, errors?: Array<{ field: string, message: string }> }
 */

export const getErrorMessage = (error, fallback = 'An unexpected error occurred. Please try again.') => {
  if (!error) return fallback;

  // Handle Axios response error
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // HTTP 429 Rate Limit
    if (status === 429) {
      return data?.message || 'Too many attempts. Please slow down and try again later.';
    }

    // Backend standardized message
    if (data?.message) {
      return data.message;
    }

    // HTTP 401 Unauthorized
    if (status === 401) {
      return 'Authentication required. Please log in again.';
    }

    // HTTP 403 Forbidden
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }

    // HTTP 404 Not Found
    if (status === 404) {
      return 'The requested resource was not found.';
    }

    // HTTP 409 Conflict
    if (status === 409) {
      return data?.message || 'A conflicting record already exists.';
    }

    // Generic HTTP error with statusText
    if (error.response.statusText) {
      return `Server error (${status}): ${error.response.statusText}`;
    }
  }

  // Network error (no response received)
  if (error.request && !error.response) {
    return 'Unable to reach the StudyRoom server. Please check your network connection.';
  }

  // Error message on JavaScript Error object
  if (error.message) {
    return error.message;
  }

  return fallback;
};

/**
 * Returns a map of field name -> error message from the backend errors array.
 * e.g. { email: 'Invalid email address', password: 'Password must contain...' }
 */
export const getFieldErrors = (error) => {
  if (!error?.response?.data?.errors) return {};

  const fieldErrors = {};
  const errors = error.response.data.errors;

  if (Array.isArray(errors)) {
    errors.forEach((err) => {
      if (err.field && err.message) {
        fieldErrors[err.field] = err.message;
      }
    });
  }

  return fieldErrors;
};

/**
 * Comprehensive error extractor helper
 */
export const extractErrorDetails = (error, fallback) => {
  return {
    message: getErrorMessage(error, fallback),
    fieldErrors: getFieldErrors(error),
    status: error?.response?.status || null,
  };
};
