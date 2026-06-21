import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Appends ?metal=/&metal= when a metal is provided (defaults to gold server-side).
const withMetal = (url: string, metal?: string) =>
  metal ? `${url}${url.includes('?') ? '&' : '?'}metal=${metal}` : url;

export const goldPriceApi = {
  getLatest: (metal?: string) => api.get(withMetal('/prices/latest', metal)),
  getStats: (metal?: string) => api.get(withMetal('/prices/stats', metal)),
  getHistory: (hours = 24, limit = 500, metal?: string) =>
    api.get(withMetal(`/prices/history?hours=${hours}&limit=${limit}`, metal)),
  getCandlestick: (timeframe = '1d', metal?: string) =>
    api.get(withMetal(`/prices/candlestick?timeframe=${timeframe}`, metal)),
  getHourly: (days = 7, metal?: string) => api.get(withMetal(`/prices/hourly?days=${days}`, metal)),
  getDaily: (months = 1, metal?: string) => api.get(withMetal(`/prices/daily?months=${months}`, metal)),
  getRatio: () => api.get('/prices/ratio'),
  getRecords: (metal?: string) => api.get(withMetal('/prices/records', metal)),
};

/** Direct download URL for the CSV export endpoint. */
export const exportHistoryUrl = (metal: string, hours = 720) =>
  `${API_URL}/api/v1/prices/export?metal=${metal}&hours=${hours}`;

export const analyticsApi = {
  getSummary: (metal?: string) => api.get(withMetal('/analytics/summary', metal)),
  getDaily: (days = 30, metal?: string) => api.get(withMetal(`/analytics/daily?days=${days}`, metal)),
  getWeekly: (weeks = 12, metal?: string) => api.get(withMetal(`/analytics/weekly?weeks=${weeks}`, metal)),
  getMonthly: (months = 12, metal?: string) => api.get(withMetal(`/analytics/monthly?months=${months}`, metal)),
  getMovingAverage: (period = 7, metal?: string) =>
    api.get(withMetal(`/analytics/moving-average?period=${period}`, metal)),
};

export const telegramApi = {
  getStatus: () => api.get('/telegram/status'),
  sendUpdate: (metal?: string, channelId?: string) =>
    api.post(withMetal('/telegram/send', metal), { channelId }),
  sendSummary: (metal?: string, channelId?: string) =>
    api.post(withMetal('/telegram/send-summary', metal), { channelId }),
  getLogs: (limit = 20) => api.get(`/telegram/logs?limit=${limit}`),
  // Channel management (each channel can carry its own message template)
  listChannels: () => api.get('/telegram/channels'),
  upsertChannel: (data: any) => api.put('/telegram/channels', data),
  deleteChannel: (id: string) => api.delete(`/telegram/channels/${id}`),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

/** Live status of every backend microservice (from the heartbeat registry). */
export const servicesApi = {
  list: () => api.get('/admin/services'),
};
