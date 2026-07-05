import api from './api';

const DAILY_LOG_ENDPOINT = '/daily-logs';

const dailyLogService = {
  // 1. تسجيل يومية جديدة
  createDailyLog: async (data) => {
    const response = await api.post(DAILY_LOG_ENDPOINT, data);
    return response.data;
  },

  // 2. جلب يوميات دورة معينة
  getCycleDailyLogs: async (cycleId, farmId) => {
    // نمرر farm_id كـ query parameter للتحقق من الصلاحيات كما يطلب الباك إند
    const response = await api.get(
      `${DAILY_LOG_ENDPOINT}/cycle/${cycleId}?farm_id=${farmId}`
    );
    return response.data;
  },

  createBulkDailyLogs: async (data) => {
    const response = await api.post('/daily-logs/bulk', data);
    return response.data;
  },
};

export default dailyLogService;
