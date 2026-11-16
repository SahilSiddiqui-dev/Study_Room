import api from './axios';

export const roomApi = {
  /**
   * List rooms: GET /api/rooms?page=&limit=&subject=
   */
  getRooms: async (params = {}) => {
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  /**
   * Get single room by ID: GET /api/rooms/:id
   */
  getRoomById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  /**
   * Create room: POST /api/rooms
   */
  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  /**
   * Update room (host only): PATCH /api/rooms/:id
   */
  updateRoom: async (id, roomData) => {
    const response = await api.patch(`/rooms/${id}`, roomData);
    return response.data;
  },

  /**
   * Close room (host only): DELETE /api/rooms/:id
   */
  deleteRoom: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },

  /**
   * Join room: POST /api/rooms/:id/join
   */
  joinRoom: async (id, joinCode) => {
    const payload = joinCode ? { joinCode } : {};
    const response = await api.post(`/rooms/${id}/join`, payload);
    return response.data;
  },

  /**
   * Leave room: POST /api/rooms/:id/leave
   */
  leaveRoom: async (id) => {
    const response = await api.post(`/rooms/${id}/leave`);
    return response.data;
  },
};

export default roomApi;
