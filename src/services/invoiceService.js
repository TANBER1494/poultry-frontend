import api from './api';

const INVOICES_ENDPOINT = '/invoices';

const invoiceService = {
  /**
   * جلب جميع الفواتير لمزرعة معينة (مع إمكانية تمرير فلاتر)
   */
  getInvoices: async (farmId, filters = {}) => {
    // تحويل الفلاتر إلى Query Parameters
    const queryParams = new URLSearchParams(filters).toString();
    const url = `${INVOICES_ENDPOINT}/farm/${farmId}${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * إصدار فاتورة مبيعات أو مشتريات عامة
   */
  createInvoice: async (data) => {
    const response = await api.post(`${INVOICES_ENDPOINT}`, data);
    return response.data;
  },

  /**
   * جلب تفاصيل فاتورة محددة مع سجل الدفعات الخاص بها
   */
  getInvoiceDetails: async (invoiceId) => {
    const response = await api.get(`${INVOICES_ENDPOINT}/${invoiceId}`);
    return response.data;
  },

  /**
   * إلغاء/حذف فاتورة (إذا لم يكن عليها دفعات)
   */
  deleteInvoice: async (invoiceId) => {
    const response = await api.delete(`${INVOICES_ENDPOINT}/${invoiceId}`);
    return response.data;
  }
};

export default invoiceService;