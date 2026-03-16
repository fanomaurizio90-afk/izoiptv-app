import axios from 'axios';
import { storage } from './storage';

const BASE_URL = 'https://www.izoiptv.com';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  await storage.appendLog({ type: 'API_REQUEST', url: config.url, method: config.method });
  return config;
});

// Log responses
apiClient.interceptors.response.use(
  async (res) => {
    await storage.appendLog({ type: 'API_RESPONSE', url: res.config.url, status: res.status });
    return res;
  },
  async (err) => {
    await storage.appendLog({ type: 'API_ERROR', url: err.config?.url, status: err.response?.status, message: err.message });
    return Promise.reject(err);
  }
);

export const api = {
  /**
   * Login with IZO IPTV credentials.
   * Returns token + xtream config.
   */
  async login(username, password) {
    const res = await apiClient.post('/api/app/login', { username, password });
    return res.data;
  },

  /**
   * Fetch user's current xtream config (server URL, username, password).
   * Call this on each app launch to get fresh credentials.
   */
  async getConfig() {
    const res = await apiClient.get('/api/app/config');
    return res.data;
  },

  /**
   * Check subscription status.
   */
  async getSubscription() {
    const res = await apiClient.get('/api/app/subscription');
    return res.data;
  },

  /**
   * Force refresh xtream playlist config.
   */
  async refreshConfig() {
    const res = await apiClient.post('/api/app/refresh');
    return res.data;
  },
};
