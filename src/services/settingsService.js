import api from './api';

const SETTINGS_ENDPOINT = '/settings';

const settingsService = {
  getSettings: async () => {
    const response = await api.get(SETTINGS_ENDPOINT);
    return response.data;
  },

  updatePhone: async (new_phone, name) => {
    const response = await api.put(`${SETTINGS_ENDPOINT}/phone`, { new_phone, name });
    return response.data;
  },

  updatePassword: async (data) => {
    const response = await api.put(`${SETTINGS_ENDPOINT}/password`, data);
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await api.put(`${SETTINGS_ENDPOINT}/preferences`, data);
    return response.data;
  }
};

export default settingsService;