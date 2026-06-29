import api from './api';

const BARNS_ENDPOINT = '/barns';

/**
 * Barn Service
 * Handles all HTTP requests related to barn management within a farm.
 */
const barnService = {
  /**
   * Retrieves all barns associated with a specific farm.
   * @param {string} farmId - The ID of the parent Farm
   * @returns {Promise<Object>} Response containing count and array of barns
   */
  getFarmBarns: async (farmId) => {
    const response = await api.get(`${BARNS_ENDPOINT}/farm/${farmId}`);
    return response.data;
  },

  /**
   * Creates a new barn inside a farm.
   * @param {Object} data - Payload: { farm_id, name, barn_type, capacity }
   * @returns {Promise<Object>} Response containing success message and the new barn
   */
  addBarn: async (data) => {
    const response = await api.post(`${BARNS_ENDPOINT}`, data);
    return response.data;
  },

  /**
   * Updates an existing barn's information.
   * Note: changing barn_type will be rejected by backend if historical cycles exist.
   * @param {string} barnId - The ID of the Barn
   * @param {Object} data - Payload: { name, barn_type, capacity, status }
   * @returns {Promise<Object>} Response containing success message and updated barn
   */
  updateBarn: async (barnId, data) => {
    const response = await api.put(`${BARNS_ENDPOINT}/${barnId}`, data);
    return response.data;
  },

  /**
   * Archives a barn (Soft Delete).
   * Note: Will be rejected by backend if the barn is linked to any production cycles.
   * @param {string} barnId - The ID of the Barn
   * @returns {Promise<Object>} Response containing success message
   */
  deleteBarn: async (barnId) => {
    const response = await api.delete(`${BARNS_ENDPOINT}/${barnId}`);
    return response.data;
  }
};

export default barnService;