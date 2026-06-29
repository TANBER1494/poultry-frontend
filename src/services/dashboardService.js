import api from './api';

const DASHBOARD_ENDPOINT = '/dashboard';

const dashboardService = {
  /**
   * جلب بيانات لوحة القيادة الشاملة (المالية، التشغيلية، المخازن) للمؤسسة
   * @returns {Promise<Object>} Grand totals and farms array
   */
  getMasterDashboard: async () => {
    const response = await api.get(`${DASHBOARD_ENDPOINT}/master`);
    return response.data;
  }
};

export default dashboardService;