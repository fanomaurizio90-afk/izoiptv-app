import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@izo_auth_token',
  USER_DATA: '@izo_user_data',
  XTREAM_CONFIG: '@izo_xtream_config',
  RECENTLY_WATCHED: '@izo_recently_watched',
  WATCH_POSITIONS: '@izo_watch_positions',
  SETTINGS: '@izo_settings',
  EPG_CACHE: '@izo_epg_cache',
  EPG_CACHE_TIME: '@izo_epg_cache_time',
  APP_LOGS: '@izo_app_logs',
};

export const storage = {
  // Auth
  async saveToken(token) {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
  },
  async getToken() {
    return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  },
  async removeToken() {
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  },

  // User
  async saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  },
  async getUser() {
    const data = await AsyncStorage.getItem(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  // Xtream config
  async saveXtreamConfig(config) {
    await AsyncStorage.setItem(KEYS.XTREAM_CONFIG, JSON.stringify(config));
  },
  async getXtreamConfig() {
    const data = await AsyncStorage.getItem(KEYS.XTREAM_CONFIG);
    return data ? JSON.parse(data) : null;
  },

  // Recently watched (array of {id, type, title, poster, position, timestamp})
  async getRecentlyWatched() {
    const data = await AsyncStorage.getItem(KEYS.RECENTLY_WATCHED);
    return data ? JSON.parse(data) : [];
  },
  async addRecentlyWatched(item) {
    let items = await storage.getRecentlyWatched();
    items = items.filter(i => !(i.id === item.id && i.type === item.type));
    items.unshift({ ...item, timestamp: Date.now() });
    if (items.length > 50) items = items.slice(0, 50);
    await AsyncStorage.setItem(KEYS.RECENTLY_WATCHED, JSON.stringify(items));
  },

  // Watch positions (for resume)
  async saveWatchPosition(id, type, position) {
    const data = await AsyncStorage.getItem(KEYS.WATCH_POSITIONS);
    const positions = data ? JSON.parse(data) : {};
    positions[`${type}_${id}`] = { position, savedAt: Date.now() };
    await AsyncStorage.setItem(KEYS.WATCH_POSITIONS, JSON.stringify(positions));
  },
  async getWatchPosition(id, type) {
    const data = await AsyncStorage.getItem(KEYS.WATCH_POSITIONS);
    const positions = data ? JSON.parse(data) : {};
    return positions[`${type}_${id}`]?.position || 0;
  },

  // Settings
  async saveSettings(settings) {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
  async getSettings() {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
      parentalPin: null,
      autoplay: true,
      defaultQuality: 'auto',
      serverUrl: '',
    };
  },

  // EPG cache
  async saveEPGCache(data) {
    await AsyncStorage.setItem(KEYS.EPG_CACHE, JSON.stringify(data));
    await AsyncStorage.setItem(KEYS.EPG_CACHE_TIME, Date.now().toString());
  },
  async getEPGCache() {
    const cacheTime = await AsyncStorage.getItem(KEYS.EPG_CACHE_TIME);
    if (!cacheTime || Date.now() - parseInt(cacheTime) > 3600000) return null; // 1hr TTL
    const data = await AsyncStorage.getItem(KEYS.EPG_CACHE);
    return data ? JSON.parse(data) : null;
  },

  // Logs (for admin debug)
  async appendLog(entry) {
    const data = await AsyncStorage.getItem(KEYS.APP_LOGS);
    const logs = data ? JSON.parse(data) : [];
    logs.unshift({ ...entry, time: new Date().toISOString() });
    if (logs.length > 200) logs.length = 200;
    await AsyncStorage.setItem(KEYS.APP_LOGS, JSON.stringify(logs));
  },
  async getLogs() {
    const data = await AsyncStorage.getItem(KEYS.APP_LOGS);
    return data ? JSON.parse(data) : [];
  },
  async clearLogs() {
    await AsyncStorage.removeItem(KEYS.APP_LOGS);
  },

  // Clear all app data
  async clearAll() {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },
};
