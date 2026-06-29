import api from './api';

const MERCHANTS_ENDPOINT = '/merchants';

const merchantService = {
  getMerchants: async (farmId, type = '') => {
    const query = type ? `?merchant_type=${type}` : '';
    const response = await api.get(`${MERCHANTS_ENDPOINT}/farm/${farmId}${query}`);
    return response.data;
  },

  addMerchant: async (data) => {
    const response = await api.post(`${MERCHANTS_ENDPOINT}`, data);
    return response.data;
  },

  updateMerchant: async (id, data) => {
    const response = await api.put(`${MERCHANTS_ENDPOINT}/${id}`, data);
    return response.data;
  },

  deleteMerchant: async (id, farmId) => {
    const response = await api.delete(`${MERCHANTS_ENDPOINT}/${id}`, {
      data: { farm_id: farmId }
    });
    return response.data;
  },

  getMerchantStatement: async (merchantId) => {
    const response = await api.get(`/merchants/${merchantId}/statement`);
    return response.data;
  },

  // 🛡️ مسارات إدارة المناديب الجديدة
  addRepresentative: async (merchantId, data) => {
    const response = await api.post(`${MERCHANTS_ENDPOINT}/${merchantId}/representatives`, data);
    return response.data;
  },

  removeRepresentative: async (merchantId, repId, farmId) => {
    const response = await api.delete(`${MERCHANTS_ENDPOINT}/${merchantId}/representatives/${repId}`, {
      data: { farm_id: farmId }
    });
    return response.data;
  }
};

export default merchantService;