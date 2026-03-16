import { storage } from './storage';
import { xtream } from './xtream';

export const epg = {
  cache: {},

  async getForChannel(streamId) {
    // Check memory cache first
    if (this.cache[streamId] && Date.now() - this.cache[streamId].fetchedAt < 600000) {
      return this.cache[streamId].data;
    }

    // Check disk cache
    const diskCache = await storage.getEPGCache();
    if (diskCache?.[streamId]) {
      this.cache[streamId] = { data: diskCache[streamId], fetchedAt: Date.now() };
      return diskCache[streamId];
    }

    try {
      const data = await xtream.getShortEPG(streamId, 4);
      const epgList = data?.epg_listings || [];
      this.cache[streamId] = { data: epgList, fetchedAt: Date.now() };

      // Persist to disk
      const allCache = diskCache || {};
      allCache[streamId] = epgList;
      await storage.saveEPGCache(allCache);

      return epgList;
    } catch (e) {
      return [];
    }
  },

  // Parse EPG timestamp to readable time
  parseTime(timestamp) {
    const d = new Date(parseInt(timestamp) * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // Get current and next programme from EPG list
  getCurrentAndNext(epgList) {
    const now = Date.now() / 1000;
    const current = epgList.find(e => parseInt(e.start_timestamp) <= now && parseInt(e.stop_timestamp) > now);
    const nextIdx = current ? epgList.indexOf(current) + 1 : 0;
    const next = epgList[nextIdx] || null;
    return { current, next };
  },

  // Get progress percentage for current show
  getProgress(epgItem) {
    if (!epgItem) return 0;
    const now = Date.now() / 1000;
    const start = parseInt(epgItem.start_timestamp);
    const stop = parseInt(epgItem.stop_timestamp);
    return Math.min(100, Math.max(0, ((now - start) / (stop - start)) * 100));
  },

  clearCache() {
    this.cache = {};
  },
};
