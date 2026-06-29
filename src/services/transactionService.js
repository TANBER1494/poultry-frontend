import api from './api';

const TRANSACTIONS_ENDPOINT = '/transactions';

const transactionService = {
  // تسجيل معاملة مالية جديدة (سحب أو إيداع يدوي)
  createTransaction: async (data) => {
    const response = await api.post(TRANSACTIONS_ENDPOINT, data);
    return response.data;
  },

  // جلب دفتر الأستاذ (كل الحركات) مع إمكانية الفلترة
  getTransactions: async (farmId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`${TRANSACTIONS_ENDPOINT}/farm/${farmId}?${params}`);
    return response.data;
  },

  // جلب ملخص السيولة النقدية (الرصيد الصافي)
  getTreasuryBalance: async (farmId) => {
    const response = await api.get(`${TRANSACTIONS_ENDPOINT}/farm/${farmId}/balance`);
    return response.data;
  }
};

export default transactionService;