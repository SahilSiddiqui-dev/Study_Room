import api from './axios';

export const sessionApi = {
  /**
   * Start study session: POST /api/sessions
   */
  startSession: async (sessionData) => {
    const response = await api.post('/sessions', sessionData);
    return response.data;
  },

  /**
   * Get currently active session: GET /api/sessions/active
   */
  getActiveSession: async () => {
    const response = await api.get('/sessions/active');
    return response.data;
  },

  /**
   * End session: PATCH /api/sessions/:id/end
   */
  endSession: async (id) => {
    const response = await api.patch(`/sessions/${id}/end`);
    return response.data;
  },

  /**
   * List past sessions: GET /api/sessions
   */
  getSessions: async (params = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  /**
   * Get events for a session: GET /api/sessions/:id/events
   */
  getSessionEvents: async (id) => {
    const response = await api.get(`/sessions/${id}/events`);
    return response.data;
  },

  /**
   * Record event via REST: POST /api/sessions/:id/events
   */
  createSessionEvent: async (sessionId, eventData) => {
    const response = await api.post(`/sessions/${sessionId}/events`, eventData);
    return response.data;
  },

  /**
   * Record one-tap break reason: POST /api/events/:id/reason
   */
  createBreakReason: async (eventId, reasonData) => {
    const response = await api.post(`/events/${eventId}/reason`, reasonData);
    return response.data;
  },
};

export default sessionApi;
