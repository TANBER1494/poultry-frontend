import api from './api';

const notificationService = {
  getNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'فشل جلب الإشعارات');
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw new Error('فشل تحديث حالة الإشعار');
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      throw new Error('فشل تحديث الإشعارات');
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw new Error('فشل حذف الإشعار');
    }
  },

  deleteAllRead: async () => {
    try {
      const response = await api.delete('/notifications/read');
      return response.data;
    } catch (error) {
      throw new Error('فشل تنظيف الإشعارات');
    }
  },

  saveFcmToken: async (token) => {
    try {
      // افترضت أن لديك مسار في الباك إند لتحديث بيانات المستخدم أو حفظ التوكن
      const response = await api.post('/notifications/register-token', { fcm_token: token });
      return response.data;
    } catch (error) {
      console.warn('فشل تسجيل التوكن في السيرفر');
    }
  }
};

export default notificationService;