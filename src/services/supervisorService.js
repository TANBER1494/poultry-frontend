import api from './api';

const SUPERVISORS_ENDPOINT = '/supervisors';

const supervisorService = {
  getSupervisors: async (farmId) => {
    const response = await api.get(`${SUPERVISORS_ENDPOINT}/farm/${farmId}`);
    return response.data;
  },

  addSupervisor: async (data) => {
    const response = await api.post(`${SUPERVISORS_ENDPOINT}`, data);
    return response.data;
  },

  updateSupervisor: async (id, data) => {
    const response = await api.put(`${SUPERVISORS_ENDPOINT}/${id}`, data);
    return response.data;
  },

  deleteSupervisor: async (id, farmId) => {
    const response = await api.delete(`${SUPERVISORS_ENDPOINT}/${id}`, { 
      data: { farm_id: farmId } 
    });
    return response.data;
  }
};

export default supervisorService;