import api from './api';

const FARMS_ENDPOINT = '/farms';

/**
 * Farm Service
 * Handles all HTTP requests related to farm management for the Owner.
 */
const farmService = {
  /**
   * Retrieves all farms associated with the owner's organization.
   * @returns {Promise<Object>} Response containing count and array of farms.
   */
  getFarms: async () => {
    const response = await api.get(`${FARMS_ENDPOINT}`);
    return response.data;
  },

  /**
   * Creates a new farm.
   * @param {Object} data - { name, location, farm_type, max_capacity, has_feed_mill(optional) }
   * @returns {Promise<Object>} Response containing success message and farm data.
   */
  addFarm: async (data) => {
    const response = await api.post(`${FARMS_ENDPOINT}`, data);
    return response.data;
  },

  /**
   * Updates basic settings of an existing farm.
   * @param {string} id - The Farm ID
   * @param {Object} data - Updated data fields
   * @returns {Promise<Object>} Response containing success message and updated farm.
   */
  updateFarmSettings: async (id, data) => {
    const response = await api.put(`${FARMS_ENDPOINT}/${id}`, data);
    return response.data;
  },

  /**
   * Suspends a farm (locks subscription), changing status to LOCKED.
   * Note: The backend route is DELETE /:id, but it performs a suspend.
   * @param {string} id - The Farm ID
   * @returns {Promise<Object>} Response containing success message.
   */
  suspendFarm: async (id) => {
    const response = await api.delete(`${FARMS_ENDPOINT}/${id}`);
    return response.data;
  },

  /**
   * Reactivates a suspended farm based on current date evaluation.
   * @param {string} id - The Farm ID
   * @returns {Promise<Object>} Response containing success message.
   */
  reactivateFarm: async (id) => {
    const response = await api.put(`${FARMS_ENDPOINT}/${id}/reactivate`);
    return response.data;
  },

  /**
   * Permanently deletes a farm if it has no linked barns, cycles, or users.
   * @param {string} id - The Farm ID
   * @returns {Promise<Object>} Response containing success message.
   */
  hardDeleteFarm: async (id) => {
    const response = await api.delete(`${FARMS_ENDPOINT}/${id}/hard-delete`);
    return response.data;
  }
};

export default farmService;