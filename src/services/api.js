import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Standardized storage keys for the Poultry ERP system
const TOKEN_KEY = 'poultry_access_token';
const REFRESH_TOKEN_KEY = 'poultry_refresh_token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

// Process queued requests after a successful token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Errors (401 Auth, 402/403 Subscription)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // إذا انتهى الاشتراك (402) أو تم إيقاف المزرعة إدارياً (403 بسبب LOCKED)
 if (error.response?.status === 402 || (error.response?.status === 403 && error.response?.data?.status === 'LOCKED')) {
      if (window.location.pathname !== '/owner/subscriptions') {
        // تمرير رسالة الخطأ القادمة من الباك إند عبر الرابط
        const errorMsg = error.response?.data?.message || 'انتهت صلاحية المزرعة، يرجى التجديد.';
        window.location.href = `/owner/subscriptions?expired=true&msg=${encodeURIComponent(errorMsg)}`;
      }
      return Promise.reject(error);
    }

    // 🛡️ منطق تجديد التوكن (Refresh Token) للخطأ 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
        
        // حفظ التوكن الجديد في المكان الذي كان فيه (Local أو Session)
        const storage = localStorage.getItem(REFRESH_TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(TOKEN_KEY, data.token);
        storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        
        processQueue(null, data.token);
        
        return api(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;