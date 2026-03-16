import axios from 'axios';
import { storage } from './storage';

let xtreamClient = null;

export function initXtream(server, username, password) {
  xtreamClient = axios.create({
    baseURL: server,
    timeout: 20000,
    params: { username, password },
  });
  xtreamClient.interceptors.response.use(
    res => res,
    async err => {
      await storage.appendLog({ type: 'XTREAM_ERROR', message: err.message, url: err.config?.url });
      return Promise.reject(err);
    }
  );
}

export function getXtreamStreamUrl(server, username, password, streamId, streamType = 'live', ext = 'ts') {
  return `${server}/${streamType}/${username}/${password}/${streamId}.${ext}`;
}

export const xtream = {
  async authenticate(server, username, password) {
    const res = await axios.get(`${server}/player_api.php`, {
      params: { username, password },
      timeout: 10000,
    });
    return res.data;
  },

  async getLiveCategories() {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_live_categories' }
    });
    return res.data;
  },

  async getLiveStreams(categoryId = null) {
    const params = { action: 'get_live_streams' };
    if (categoryId) params.category_id = categoryId;
    const res = await xtreamClient.get('/player_api.php', { params });
    return res.data;
  },

  async getVODCategories() {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_vod_categories' }
    });
    return res.data;
  },

  async getVODStreams(categoryId = null) {
    const params = { action: 'get_vod_streams' };
    if (categoryId) params.category_id = categoryId;
    const res = await xtreamClient.get('/player_api.php', { params });
    return res.data;
  },

  async getVODInfo(vodId) {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_vod_info', vod_id: vodId }
    });
    return res.data;
  },

  async getSeriesCategories() {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_series_categories' }
    });
    return res.data;
  },

  async getSeries(categoryId = null) {
    const params = { action: 'get_series' };
    if (categoryId) params.category_id = categoryId;
    const res = await xtreamClient.get('/player_api.php', { params });
    return res.data;
  },

  async getSeriesInfo(seriesId) {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_series_info', series_id: seriesId }
    });
    return res.data;
  },

  async getShortEPG(streamId, limit = 4) {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_short_epg', stream_id: streamId, limit }
    });
    return res.data;
  },

  async getEPG(streamId) {
    const res = await xtreamClient.get('/player_api.php', {
      params: { action: 'get_simple_data_table', stream_id: streamId }
    });
    return res.data;
  },

  // Search across live, vod, series
  search(items, query) {
    const q = query.toLowerCase();
    return items.filter(item => {
      const name = (item.name || item.title || '').toLowerCase();
      return name.includes(q);
    });
  },
};
