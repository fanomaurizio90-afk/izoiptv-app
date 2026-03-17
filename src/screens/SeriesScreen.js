import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, ScrollView, BackHandler, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { xtream, getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

// Some Xtream servers return objects instead of plain arrays
function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    const values = Object.values(data);
    if (values.length && typeof values[0] === 'object') return values;
  }
  return [];
}

function CategoryItem({ item, isSelected, onPress }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.catBtn, isSelected && styles.catBtnActive, focused && styles.catBtnFocused]}
    >
      <Text style={[styles.catBtnText, isSelected && styles.catBtnTextActive]} numberOfLines={2}>
        {item.category_name}
      </Text>
    </Pressable>
  );
}

function SeriesCard({ item, onPress }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.seriesCard, focused && styles.seriesCardFocused]}
    >
      {item.cover ? (
        <Image source={{ uri: item.cover }} style={styles.seriesPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.seriesPoster, styles.noImage]}>
          <Text style={styles.noImageText}>{(item.name || '?')[0]}</Text>
        </View>
      )}
      <LinearGradient colors={['transparent', 'rgba(3,3,8,0.98)']} style={styles.seriesGrad} />
      <Text style={styles.seriesName} numberOfLines={2}>{item.name}</Text>
      {focused && <View style={styles.focusRing} />}
    </Pressable>
  );
}

export default function SeriesScreen({ navigation }) {
  const { xtreamConfig } = useAuth();

  const [categories, setCategories] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [seriesDetail, setSeriesDetail] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedSeries) { setSelectedSeries(null); setSeriesDetail(null); return true; }
        navigation.goBack(); return true;
      });
      return () => sub.remove();
    }, [selectedSeries])
  );

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const raw = await xtream.getSeriesCategories();
      const cats = toArray(raw);
      setCategories(cats);
      if (cats.length) {
        setSelectedCat(cats[0].category_id);
        loadSeriesForCategory(cats[0].category_id);
      }
    } catch (e) {
      console.warn('Series categories error:', e.message);
    } finally {
      setLoadingCats(false);
    }
  };

  const loadSeriesForCategory = async (categoryId) => {
    setLoadingSeries(true);
    setSeriesList([]);
    try {
      const raw = await xtream.getSeries(categoryId);
      const list = toArray(raw);
      // Fallback: if category filter returns nothing, try without filter then filter client-side
      if (list.length === 0) {
        const allRaw = await xtream.getSeries(null);
        const all = toArray(allRaw);
        const filtered = categoryId
          ? all.filter(s => String(s.category_id) === String(categoryId))
          : all;
        setSeriesList(filtered.length > 0 ? filtered : all.slice(0, 100));
      } else {
        setSeriesList(list);
      }
    } catch (e) {
      console.warn('Series load error:', e.message);
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleCatSelect = (catId) => {
    if (catId === selectedCat) return;
    setSelectedCat(catId);
    loadSeriesForCategory(catId);
  };

  const selectSeries = async (s) => {
    setSelectedSeries(s);
    setLoadingDetail(true);
    setSeriesDetail(null);
    try {
      const detail = await xtream.getSeriesInfo(s.series_id);
      setSeriesDetail(detail);
      const firstSeason = parseInt(Object.keys(detail?.episodes || {})[0] || 1);
      setSelectedSeason(firstSeason);
    } catch (e) {
      console.warn('Series detail error:', e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const playEpisode = (episode) => {
    if (!xtreamConfig) return;
    const url = getXtreamStreamUrl(
      xtreamConfig.server, xtreamConfig.username, xtreamConfig.password,
      episode.id, 'series', episode.container_extension || 'mp4'
    );
    navigation.navigate('Player', {
      stream: {
        ...episode,
        name: `${selectedSeries?.name} S${selectedSeason}E${episode.episode_num}`,
        streamType: 'vod',
        url,
      },
    });
  };

  // ── Loading states ─────────────────────────────────────────────────────────
  if (loadingCats) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color="#00f0ff" size="large" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  // ── Series detail view ─────────────────────────────────────────────────────
  if (selectedSeries) {
    const seasons = Object.keys(seriesDetail?.episodes || {});
    const episodes = toArray(seriesDetail?.episodes?.[selectedSeason]);

    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable onPress={() => { setSelectedSeries(null); setSeriesDetail(null); }} style={styles.backBtn}>
            <Text style={styles.backText}>← Series</Text>
          </Pressable>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedSeries.name}</Text>
        </View>

        {loadingDetail ? (
          <View style={styles.fullCenter}>
            <ActivityIndicator color="#00f0ff" size="large" />
            <Text style={styles.loadingText}>Loading episodes...</Text>
          </View>
        ) : (
          <View style={styles.detailBody}>
            {/* Poster + info sidebar */}
            <View style={styles.detailSidebar}>
              {selectedSeries.cover ? (
                <Image source={{ uri: selectedSeries.cover }} style={styles.detailPoster} resizeMode="cover" />
              ) : (
                <View style={[styles.detailPoster, styles.noImage]}>
                  <Text style={styles.noImageText}>{(selectedSeries.name || '?')[0]}</Text>
                </View>
              )}
              {selectedSeries.rating ? <Text style={styles.detailRating}>★ {selectedSeries.rating}</Text> : null}
              {seriesDetail?.info?.genre ? <Text style={styles.detailGenre}>{seriesDetail.info.genre}</Text> : null}
              {seriesDetail?.info?.plot ? (
                <Text style={styles.detailPlot} numberOfLines={8}>{seriesDetail.info.plot}</Text>
              ) : null}
            </View>

            {/* Episodes pane */}
            <View style={styles.episodesPane}>
              {/* Season tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.seasonTabsScroll}
                contentContainerStyle={styles.seasonTabsContent}
              >
                {seasons.map(s => (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedSeason(parseInt(s))}
                    style={[styles.seasonTab, selectedSeason === parseInt(s) && styles.seasonTabActive]}
                  >
                    <Text style={[styles.seasonTabText, selectedSeason === parseInt(s) && styles.seasonTabTextActive]}>
                      Season {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <FlatList
                data={episodes}
                keyExtractor={ep => String(ep.id)}
                contentContainerStyle={styles.epList}
                renderItem={({ item: ep }) => (
                  <Pressable
                    onPress={() => playEpisode(ep)}
                    style={({ focused }) => [styles.epRow, focused && styles.epRowFocused]}
                  >
                    <View style={styles.epNum}>
                      <Text style={styles.epNumText}>{ep.episode_num}</Text>
                    </View>
                    <View style={styles.epInfo}>
                      <Text style={styles.epTitle} numberOfLines={1}>
                        {ep.title || `Episode ${ep.episode_num}`}
                      </Text>
                      {ep.info?.plot ? (
                        <Text style={styles.epPlot} numberOfLines={2}>{ep.info.plot}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.playIcon}>▶</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // ── Series list view (category sidebar + grid) ─────────────────────────────
  return (
    <View style={styles.container}>
      {/* Category sidebar */}
      <View style={styles.sidebar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.sideTitle}>SERIES</Text>
        <Text style={styles.sideCount}>{seriesList.length} shows</Text>
        <View style={styles.sideDivider} />
        <FlatList
          data={categories}
          keyExtractor={item => String(item.category_id)}
          renderItem={({ item }) => (
            <CategoryItem
              item={item}
              isSelected={selectedCat === item.category_id}
              onPress={() => handleCatSelect(item.category_id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={5}
        />
      </View>

      {/* Series grid */}
      <View style={styles.main}>
        {loadingSeries ? (
          <View style={styles.fullCenter}>
            <ActivityIndicator color="#00f0ff" size="large" />
            <Text style={styles.loadingText}>Loading series...</Text>
          </View>
        ) : (
          <FlatList
            data={seriesList}
            numColumns={Math.floor((require('react-native').Dimensions.get('window').width - 200 - 32) / (130 + 12))}
            keyExtractor={item => String(item.series_id)}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <SeriesCard item={item} onPress={() => selectSeries(item)} />
            )}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={5}
            removeClippedSubviews
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308', flexDirection: 'row' },
  fullCenter: { flex: 1, backgroundColor: '#030308', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // Sidebar
  sidebar: {
    width: 180, backgroundColor: '#050510',
    borderRightWidth: 1, borderRightColor: 'rgba(0,240,255,0.08)',
    paddingTop: 16, paddingHorizontal: 10,
  },
  backBtn: { marginBottom: 12 },
  backText: { color: '#00f0ff', fontSize: 13, fontWeight: '700' },
  sideTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  sideCount: { color: 'rgba(0,240,255,0.5)', fontSize: 11, marginBottom: 10 },
  sideDivider: { height: 1, backgroundColor: 'rgba(0,240,255,0.08)', marginBottom: 8 },
  catBtn: { paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  catBtnActive: { backgroundColor: 'rgba(0,240,255,0.08)', borderLeftColor: '#00f0ff' },
  catBtnFocused: { backgroundColor: 'rgba(0,240,255,0.12)', borderLeftColor: '#00f0ff' },
  catBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  catBtnTextActive: { color: '#00f0ff' },

  // Main grid
  main: { flex: 1 },
  grid: { padding: 12, paddingBottom: 40, gap: 12 },
  seriesCard: {
    width: 130, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#0d0d1a',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    margin: 6,
  },
  seriesCardFocused: {
    borderColor: '#00f0ff',
    shadowColor: '#00f0ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
  },
  seriesPoster: { width: '100%', height: 195 },
  noImage: { backgroundColor: '#0a0a1f', alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: 'rgba(0,240,255,0.3)', fontSize: 40, fontWeight: '900' },
  seriesGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  seriesName: { position: 'absolute', bottom: 8, left: 8, right: 8, color: '#fff', fontSize: 11, fontWeight: '700' },
  focusRing: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: '#00f0ff', borderRadius: 10 },

  // Detail header
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)',
    backgroundColor: '#050510', gap: 12,
  },
  detailHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 },
  detailBody: { flex: 1, flexDirection: 'row' },
  detailSidebar: { width: 220, padding: 16, gap: 10 },
  detailPoster: { width: '100%', height: 280, borderRadius: 12, backgroundColor: '#0a0a1f' },
  detailRating: { color: '#00f0ff', fontSize: 14 },
  detailGenre: { color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 1 },
  detailPlot: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18 },

  // Episodes
  episodesPane: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(0,240,255,0.08)' },
  seasonTabsScroll: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)' },
  seasonTabsContent: { gap: 8, padding: 12 },
  seasonTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  seasonTabActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0,240,255,0.1)' },
  seasonTabText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12 },
  seasonTabTextActive: { color: '#00f0ff' },
  epList: { padding: 12, gap: 4 },
  epRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 10, gap: 12, borderWidth: 1, borderColor: 'transparent',
  },
  epRowFocused: { backgroundColor: 'rgba(0,240,255,0.08)', borderColor: 'rgba(0,240,255,0.3)' },
  epNum: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,240,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)',
  },
  epNumText: { color: '#00f0ff', fontWeight: '900', fontSize: 13 },
  epInfo: { flex: 1 },
  epTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  epPlot: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 },
  playIcon: { color: 'rgba(0,240,255,0.5)', fontSize: 16 },
});
