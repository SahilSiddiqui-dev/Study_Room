import api from './axios';

export const authApi = {
  /**
   * Register a new user: POST /api/auth/register
   * Sets httpOnly token cookie upon success.
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Login user: POST /api/auth/login
   * Sets httpOnly token cookie upon success.
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Logout user: POST /api/auth/logout
   * Clears httpOnly token cookie.
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Bootstrap auth check: GET /api/auth/me
   * Fetches currently authenticated user record.
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Fetch available avatar keys: GET /api/users/avatars
   */
  getAvatars: async () => {
    const response = await api.get('/users/avatars');
    return response.data;
  },
};

export default authApi;
