import api from './axios';

export const analyticsApi = {
  /**
   * Get period summary & FQS: GET /api/analytics/summary?range=7d|30d
   */
  getSummary: async (range = '7d') => {
    const response = await api.get('/analytics/summary', { params: { range } });
    return response.data;
  },

  /**
   * Get break reason category breakdown: GET /api/analytics/reasons?range=7d|30d
   */
  getReasons: async (range = '7d') => {
    const response = await api.get('/analytics/reasons', { params: { range } });
    return response.data;
  },

  /**
   * Get 7x24 weekday-hour heatmap: GET /api/analytics/heatmap?range=7d|30d
   */
  getHeatmap: async (range = '7d') => {
    const response = await api.get('/analytics/heatmap', { params: { range } });
    return response.data;
  },

  /**
   * Get per-subject metrics: GET /api/analytics/subjects?range=7d|30d
   */
  getSubjects: async (range = '7d') => {
    const response = await api.get('/analytics/subjects', { params: { range } });
    return response.data;
  },

  /**
   * Get evaluated coach tips: GET /api/analytics/coach?range=7d|30d
   */
  getCoach: async (range = '7d') => {
    const response = await api.get('/analytics/coach', { params: { range } });
    return response.data;
  },
};

export default analyticsApi;
