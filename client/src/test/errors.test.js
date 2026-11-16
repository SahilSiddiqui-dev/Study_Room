import { describe, it, expect } from 'vitest';
import { getErrorMessage, getFieldErrors, extractErrorDetails } from '../utils/errors';

describe('Error Extractor Helpers', () => {
  it('extracts standardized message from backend error response', () => {
    const error = {
      response: {
        status: 400,
        data: {
          success: false,
          message: 'Invalid room name provided',
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Invalid room name provided');
  });

  it('handles HTTP 429 rate limit with a clear slow-down message', () => {
    const error = {
      response: {
        status: 429,
        data: {
          success: false,
          message: 'Too many requests, please try again later.',
        },
      },
    };
    expect(getErrorMessage(error)).toContain('Too many');
  });

  it('handles network disconnection gracefully', () => {
    const error = {
      request: {}, // request sent, but no response received
    };
    expect(getErrorMessage(error)).toContain('Unable to reach the StudyRoom server');
  });

  it('extracts field-specific validation errors into a map', () => {
    const error = {
      response: {
        status: 400,
        data: {
          success: false,
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'Invalid email address' },
            { field: 'password', message: 'Password is too short' },
          ],
        },
      },
    };

    const fieldErrors = getFieldErrors(error);
    expect(fieldErrors).toEqual({
      email: 'Invalid email address',
      password: 'Password is too short',
    });
  });

  it('returns fallback message when error is null or empty', () => {
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });
});
