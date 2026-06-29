import api from './api';

const PAYMENT_ENDPOINT = '/platform-payments';

const platformPaymentService = {
  // رفع طلب التجديد (مع الصورة)
  submitRequest: async (formData) => {
    const response = await api.post(`${PAYMENT_ENDPOINT}/request`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // جلب سجل مدفوعات المالك
  getHistory: async () => {
    const response = await api.get(`${PAYMENT_ENDPOINT}/history`);
    return response.data;
  },

  // إخفاء سجلات مزرعة معينة
  clearFarmHistory: async (farmId) => {
    const response = await api.delete(`${PAYMENT_ENDPOINT}/farms/${farmId}`);
    return response.data;
  }
};

export default platformPaymentService;