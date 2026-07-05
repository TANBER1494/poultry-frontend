import api from './api';

const INVENTORY_ENDPOINT = '/inventory';

const inventoryService = {
  // 1. جلب الأصناف الخاصة بمزرعة
  getInventoryItems: async (farmId) => {
    const response = await api.get(`${INVENTORY_ENDPOINT}/farms/${farmId}/items`);
    return response.data;
  },

  // 2. إضافة صنف جديد
  addInventoryItem: async (data) => {
    const response = await api.post(`${INVENTORY_ENDPOINT}/items`, data);
    return response.data;
  },

  // 3. تحديث صنف
  updateInventoryItem: async (itemId, data) => {
    const response = await api.put(`${INVENTORY_ENDPOINT}/items/${itemId}`, data);
    return response.data;
  },

  // 4. أرشفة/حذف صنف (🚀 التعديل الجراحي: تمرير farmId كـ body لتجاوز حماية המيدل وير)
  deleteInventoryItem: async (itemId, farmId) => {
    const response = await api.delete(`${INVENTORY_ENDPOINT}/items/${itemId}`, {
      data: { farm_id: farmId }
    });
    return response.data;
  },

  // 5. تسجيل حركة مخزنية (وارد/منصرف)
  recordMovement: async (data) => {
    const response = await api.post(`${INVENTORY_ENDPOINT}/movements`, data);
    return response.data;
  },

  // 6. كشف حساب/حركات الصنف
  getItemMovements: async (itemId) => {
    const response = await api.get(`${INVENTORY_ENDPOINT}/items/${itemId}/movements`);
    return response.data;
  },
  
  // 7. صرف عهدة من المخزن الرئيسي للعنبر
  transferToBarn: async (data) => {
    const response = await api.post(`${INVENTORY_ENDPOINT}/transfer-to-barn`, data);
    return response.data;
  },

  confirmMovement: async (movementId) => {
    const response = await api.put(`${INVENTORY_ENDPOINT}/movements/${movementId}/confirm`);
    return response.data;
  },

  produceFeed: async (data) => {
    const response = await api.post(`${INVENTORY_ENDPOINT}/produce-feed`, data);
    return response.data;
  },

  getPendingMovements: async (farmId) => {
    const response = await api.get(`${INVENTORY_ENDPOINT}/farms/${farmId}/movements/pending`);
    return response.data;
  },
};

export default inventoryService;