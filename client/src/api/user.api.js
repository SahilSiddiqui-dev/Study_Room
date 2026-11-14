import api from './axios';

export const userApi = {
  /**
   * Get authenticated user profile: GET /api/users/me
   */
  getMyProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  /**
   * Update profile (avatar, timezone): PATCH /api/users/me
   */
  updateMyProfile: async (data) => {
    const response = await api.patch('/users/me', data);
    return response.data;
  },

  /**
   * Change password: PATCH /api/users/me/password
   */
  changePassword: async (data) => {
    const response = await api.patch('/users/me/password', data);
    return response.data;
  },

  /**
   * Get public profile by username: GET /api/users/:username
   */
  getUserProfile: async (username) => {
    const response = await api.get(`/users/${encodeURIComponent(username)}`);
    return response.data;
  },
};

export default userApi;
