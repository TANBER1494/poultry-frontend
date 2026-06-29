import api from './api';

const WORKER_ENDPOINT = '/workers';

const workerService = {
  addWorker: async (data) => {
    const response = await api.post(WORKER_ENDPOINT, data);
    return response.data;
  },

  getWorkers: async (farmId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`${WORKER_ENDPOINT}/farm/${farmId}?${params}`);
    return response.data;
  },

  recordLog: async (data) => {
    const response = await api.post(`${WORKER_ENDPOINT}/logs`, data);
    return response.data;
  },

  getWorkerStatement: async (workerId) => {
    const response = await api.get(`${WORKER_ENDPOINT}/${workerId}/statement`);
    return response.data;
  },

  settleAccount: async (data) => {
    const response = await api.post(`${WORKER_ENDPOINT}/settle`, data);
    return response.data;
  },

  changeStatus: async (workerId, status) => {
    const response = await api.put(`${WORKER_ENDPOINT}/${workerId}/status`, { status });
    return response.data;
  }
};

export default workerService;