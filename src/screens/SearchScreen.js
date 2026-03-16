import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, Image, Dimensions, BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { xtream, getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const { width } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  const { xtreamConfig } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allContent, setAllContent] = useState([]);
  const [contentLoaded, setContentLoaded] = useState(false);
  const inputRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadAllContent();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { navigation.goBack(); return true; });
      return () => sub.remove();
    }, [])
  );

  const loadAllContent = async () => {
    if (contentLoaded) return;
    setLoading(true);
    try {
      const [live, vod, series] = await Promise.allSettled([
        xtream.getLiveStreams(),
        xtream.getVODStreams(),
        xtream.getSeries(),
      ]);
      const all = [
        ...(live.value || []).map(i => ({ ...i, _type: 'live' })),
        ...(vod.value || []).map(i => ({ ...i, _type: 'vod' })),
        ...(series.value || []).map(i => ({ ...i, _type: 'series' })),
      ];
      setAllContent(all);
      setContentLoaded(true);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const handleSearch = (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const r = xtream.search(allContent, q).slice(0, 80);
    setResults(r);
  };

  const handlePlay = (item) => {
    if (!xtreamConfig) return;
    if (item._type === 'series') {
      navigation.navigate('Series', { seriesId: item.series_id, seriesInfo: item });
      return;
    }
    const streamType = item._type === 'live' ? 'live' : 'movie';
    const id = item.stream_id;
    const ext = item._type === 'live' ? 'ts' : 'mp4';
    const url = getXtreamStreamUrl(xtreamConfig.server, xtreamConfig.username, xtreamConfig.password, id, streamType, ext);
    navigation.navigate('Player', { stream: { ...item, streamType: item._type, url } });
  };

  const typeLabel = (t) => ({ live: '📡 LIVE', vod: '🎬 MOVIE', series: '📺 SERIES' }[t] || t.toUpperCase());
  const typeColor = (t) => ({ live: '#00f0ff', vod: '#a855f7', series: '#4ade80' }[t] || '#fff');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search channels, movies, series..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          autoFocus
        />
        {query ? (
          <Pressable onPress={() => handleSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><LoadingSpinner size={40} label="Loading content..." /></View>
      ) : !query ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search Everything</Text>
          <Text style={styles.emptyText}>{allContent.length.toLocaleString()} items available</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>○</Text>
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item._type}_${item.stream_id || item.series_id}_${i}`}
          contentContainerStyle={styles.resultList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePlay(item)}
              style={({ focused }) => [styles.resultRow, focused && styles.resultRowFocused]}
            >
              {(item.stream_icon || item.cover) ? (
                <Image source={{ uri: item.stream_icon || item.cover }} style={styles.resultThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.resultThumb, styles.resultThumbPlaceholder]}>
                  <Text style={styles.resultThumbText}>{(item.name || '?')[0]}</Text>
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name || item.title}</Text>
                <View style={styles.resultMeta}>
                  <View style={[styles.typeBadge, { borderColor: typeColor(item._type) }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor(item._type) }]}>{typeLabel(item._type)}</Text>
                  </View>
                  {item.category_name && <Text style={styles.catName}>{item.category_name}</Text>}
                  {item.rating && <Text style={styles.rating}>★ {parseFloat(item.rating).toFixed(1)}</Text>}
                </View>
              </View>
              <Text style={styles.playArrow}>▶</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.1)', backgroundColor: '#050510', gap: 12,
  },
  backBtn: { paddingRight: 4 },
  backText: { color: '#00f0ff', fontSize: 22, fontWeight: '900' },
  searchInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: '#ffffff', fontSize: 16,
  },
  clearBtn: { padding: 8 },
  clearText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: '700' },
  emptyText: { color: 'rgba(0,240,255,0.5)', fontSize: 14 },
  resultList: { padding: 12, gap: 4 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'transparent',
  },
  resultRowFocused: { backgroundColor: 'rgba(0,240,255,0.07)', borderColor: 'rgba(0,240,255,0.25)' },
  resultThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#0d0d1a' },
  resultThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,240,255,0.1)' },
  resultThumbText: { color: 'rgba(0,240,255,0.4)', fontSize: 22, fontWeight: '900' },
  resultInfo: { flex: 1 },
  resultName: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  catName: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  rating: { color: '#00f0ff', fontSize: 11 },
  playArrow: { color: 'rgba(0,240,255,0.4)', fontSize: 18 },
});
