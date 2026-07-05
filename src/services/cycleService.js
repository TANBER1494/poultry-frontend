import api from './api';

const CYCLES_ENDPOINT = '/cycles';

/**
 * Cycle Service
 * Handles production cycles, bird counts, and sales operations.
 */
const cycleService = {
  /**
   * Retrieves all cycles for a specific farm.
   * @param {string} farmId - The ID of the Farm
   * @param {string} [status] - Optional filter by status ('PREPARATION', 'ACTIVE', 'CLOSED')
   * @returns {Promise<Object>} Response containing count and array of cycles
   */
  getFarmCycles: async (farmId, status = '') => {
    const query = status ? `?status=${status}` : '';
    const response = await api.get(`${CYCLES_ENDPOINT}/farm/${farmId}${query}`);
    return response.data;
  },

  /**
   * Retrieves full details of a specific cycle.
   * @param {string} cycleId - The ID of the Cycle
   * @returns {Promise<Object>} The cycle details object
   */
  getCycleDetails: async (cycleId) => {
    const response = await api.get(`${CYCLES_ENDPOINT}/${cycleId}`);
    return response.data;
  },

  /**
   * Starts a new production cycle in a barn.
   * @param {Object} data - { farm_id, barn_id, supervisor_id, name, type, start_date, initial_bird_count }
   * @returns {Promise<Object>} Response containing success message and new cycle
   */
  startCycle: async (data) => {
    const response = await api.post(`${CYCLES_ENDPOINT}`, data);
    return response.data;
  },

  /**
   * Closes a cycle and finalizes its accounting.
   * @param {string} cycleId - The ID of the Cycle
   * @param {string} endDate - ISO Date string for when the cycle ended
   * @returns {Promise<Object>} Response containing accounting summary
   */
  closeCycle: async (cycleId, endDate, farmId) => {
    const response = await api.put(`${CYCLES_ENDPOINT}/${cycleId}/close`, {
      end_date: endDate,
      farm_id: farmId,
    });
    return response.data;
  },

  /**
   * Records a sales transaction and automatically deducts live bird count.
   * @param {string} cycleId - The ID of the Cycle
   * @param {Object} data - { local_id, merchant_id, birds_sold_count, total_weight_kg, price_per_kg, transaction_date, paid_amount(optional), notes }
   * @returns {Promise<Object>} Response containing invoice and remaining birds
   */
  sellCycleBirds: async (cycleId, data) => {
    const response = await api.post(`${CYCLES_ENDPOINT}/${cycleId}/sell`, data);
    return response.data;
  },

recordCycleSale: async (cycleId, data) => {
    // تم التعديل من sell إلى sales لتطابق الباك إند
    const response = await api.post(`/cycles/${cycleId}/sales`, data); 
    return response.data;
  },

  getFarmFinancialSummary: async (farmId) => {
    const response = await api.get(`/cycles/farm/${farmId}/financial-summary`);
    return response.data;
  },
  
};

export default cycleService;
