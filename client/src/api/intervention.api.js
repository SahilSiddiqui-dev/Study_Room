import api from './axios';

export const interventionApi = {
  /**
   * Commit to a coach intervention: POST /api/interventions
   * { ruleId, suggestedAction }
   */
  createIntervention: async (data) => {
    const response = await api.post('/interventions', data);
    return response.data;
  },

  /**
   * Get intervention before/after outcome report: GET /api/interventions/report
   */
  getReport: async () => {
    const response = await api.get('/interventions/report');
    return response.data;
  },
};

export default interventionApi;
