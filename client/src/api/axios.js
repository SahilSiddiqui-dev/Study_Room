import axios from 'axios';

// Read API URL from environment variable, falling back to standard local port
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Standard Axios instance configured with cookie authentication.
 * The JWT token is stored inside an httpOnly cookie and sent automatically by the browser.
 * Never store the token in localStorage or sessionStorage.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let queryClientInstance = null;

export const setQueryClient = (queryClient) => {
  queryClientInstance = queryClient;
};

// Global response interceptor: redirects to /login on 401 (except for bootstrap /auth/me and /auth/login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const originalRequestUrl = error.config?.url || '';

      // Do not redirect if it's the bootstrap check or a login attempt
      const isAuthCheck = originalRequestUrl.includes('/auth/me');
      const isLoginAttempt = originalRequestUrl.includes('/auth/login');

      if (!isAuthCheck && !isLoginAttempt) {
        if (queryClientInstance) {
          queryClientInstance.clear();
        }

        // Avoid infinite loop if already on /login or /register
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
