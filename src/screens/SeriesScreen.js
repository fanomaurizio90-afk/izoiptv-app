import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, ScrollView, BackHandler, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { xtream } from '../services/xtream';
import { getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const { width } = Dimensions.get('window');

export default function SeriesScreen({ navigation, route }) {
  const { xtreamConfig } = useAuth();
  const { seriesId: initialSeriesId, seriesInfo } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [seriesDetail, setSeriesDetail] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedSeries) { setSelectedSeries(null); return true; }
        navigation.goBack(); return true;
      });
      return () => sub.remove();
    }, [selectedSeries])
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await xtream.getSeries();
      setSeries(data);
      if (initialSeriesId) {
        const found = data.find(s => s.series_id === initialSeriesId);
        if (found) selectSeries(found);
      }
    } catch (e) { console.warn('Series load error:', e.message); }
    finally { setLoading(false); }
  };

  const selectSeries = async (s) => {
    setSelectedSeries(s);
    setLoadingDetail(true);
    try {
      const detail = await xtream.getSeriesInfo(s.series_id);
      setSeriesDetail(detail);
      setSelectedSeason(parseInt(Object.keys(detail?.episodes || {})[0] || 1));
    } catch (e) { console.warn('Series detail error:', e.message); }
    finally { setLoadingDetail(false); }
  };

  const playEpisode = (episode) => {
    if (!xtreamConfig) return;
    const url = getXtreamStreamUrl(xtreamConfig.server, xtreamConfig.username, xtreamConfig.password, episode.id, 'series', episode.container_extension || 'mp4');
    navigation.navigate('Player', {
      stream: { ...episode, name: `${selectedSeries?.name} S${selectedSeason}E${episode.episode_num}`, streamType: 'vod', url }
    });
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <LoadingSpinner size={52} label="Loading series..." />
    </View>
  );

  // Series detail view
  if (selectedSeries && seriesDetail) {
    const seasons = Object.keys(seriesDetail.episodes || {});
    const episodes = seriesDetail.episodes?.[selectedSeason] || [];
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable onPress={() => setSelectedSeries(null)} style={styles.backBtn}>
            <Text style={styles.backText}>← All Series</Text>
          </Pressable>
        </View>
        <View style={styles.detailBody}>
          {/* Poster */}
          <View style={styles.detailSidebar}>
            {selectedSeries.cover ? (
              <Image source={{ uri: selectedSeries.cover }} style={styles.detailPoster} resizeMode="cover" />
            ) : (
              <View style={[styles.detailPoster, styles.noImage]}>
                <Text style={styles.noImageText}>{(selectedSeries.name || '?')[0]}</Text>
              </View>
            )}
            <Text style={styles.detailTitle}>{selectedSeries.name}</Text>
            {selectedSeries.rating && <Text style={styles.detailRating}>★ {selectedSeries.rating}</Text>}
            {seriesDetail.info?.genre && <Text style={styles.detailGenre}>{seriesDetail.info.genre}</Text>}
            {seriesDetail.info?.plot && (
              <Text style={styles.detailPlot} numberOfLines={6}>{seriesDetail.info.plot}</Text>
            )}
          </View>
          {/* Episodes */}
          <View style={styles.episodesPane}>
            {/* Season tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs} contentContainerStyle={{ gap: 8, padding: 12 }}>
              {seasons.map(s => (
                <Pressable key={s} onPress={() => setSelectedSeason(parseInt(s))} style={[styles.seasonTab, selectedSeason === parseInt(s) && styles.seasonTabActive]}>
                  <Text style={[styles.seasonTabText, selectedSeason === parseInt(s) && styles.seasonTabTextActive]}>S{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <FlatList
              data={episodes}
              keyExtractor={ep => String(ep.id)}
              contentContainerStyle={styles.epList}
              renderItem={({ item: ep }) => (
                <Pressable onPress={() => playEpisode(ep)} style={({ focused }) => [styles.epRow, focused && styles.epRowFocused]}>
                  <View style={styles.epNum}><Text style={styles.epNumText}>{ep.episode_num}</Text></View>
                  <View style={styles.epInfo}>
                    <Text style={styles.epTitle} numberOfLines={1}>{ep.title || `Episode ${ep.episode_num}`}</Text>
                    {ep.info?.plot && <Text style={styles.epPlot} numberOfLines={2}>{ep.info.plot}</Text>}
                  </View>
                  <Text style={styles.playIcon}>▶</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </View>
    );
  }

  // Series grid
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.headerTitle}>SERIES</Text>
        <Text style={styles.headerCount}>{series.length} shows</Text>
      </View>
      <FlatList
        data={series}
        numColumns={6}
        keyExtractor={item => String(item.series_id)}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => selectSeries(item)} style={({ focused }) => [styles.seriesCard, focused && styles.seriesCardFocused]}>
            {item.cover ? (
              <Image source={{ uri: item.cover }} style={styles.seriesPoster} resizeMode="cover" />
            ) : (
              <View style={[styles.seriesPoster, styles.noImage]}><Text style={styles.noImageText}>{(item.name || '?')[0]}</Text></View>
            )}
            <LinearGradient colors={['transparent', 'rgba(3,3,8,0.98)']} style={styles.seriesGrad} />
            <Text style={styles.seriesName} numberOfLines={2}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  loadingWrap: { flex: 1, backgroundColor: '#030308', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)', backgroundColor: '#050510', gap: 12,
  },
  backBtn: { paddingRight: 8 },
  backText: { color: '#00f0ff', fontSize: 13, fontWeight: '700' },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 3, flex: 1 },
  headerCount: { color: 'rgba(0,240,255,0.5)', fontSize: 12 },
  grid: { padding: 16, paddingBottom: 40 },
  seriesCard: { width: 130, borderRadius: 10, overflow: 'hidden', backgroundColor: '#0d0d1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  seriesCardFocused: { borderColor: '#00f0ff', shadowColor: '#00f0ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10 },
  seriesPoster: { width: '100%', height: 195 },
  noImage: { backgroundColor: '#0a0a1f', alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: 'rgba(0,240,255,0.3)', fontSize: 40, fontWeight: '900' },
  seriesGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  seriesName: { position: 'absolute', bottom: 8, left: 8, right: 8, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)', backgroundColor: '#050510' },
  detailBody: { flex: 1, flexDirection: 'row' },
  detailSidebar: { width: 240, padding: 20, gap: 10 },
  detailPoster: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#0a0a1f' },
  detailTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  detailRating: { color: '#00f0ff', fontSize: 14 },
  detailGenre: { color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 1 },
  detailPlot: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18 },
  episodesPane: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(0,240,255,0.08)' },
  seasonTabs: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)' },
  seasonTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  seasonTabActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0,240,255,0.1)' },
  seasonTabText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12 },
  seasonTabTextActive: { color: '#00f0ff' },
  epList: { padding: 12, gap: 4 },
  epRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, gap: 12, borderWidth: 1, borderColor: 'transparent' },
  epRowFocused: { backgroundColor: 'rgba(0,240,255,0.08)', borderColor: 'rgba(0,240,255,0.3)' },
  epNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,240,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)' },
  epNumText: { color: '#00f0ff', fontWeight: '900', fontSize: 13 },
  epInfo: { flex: 1 },
  epTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  epPlot: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 },
  playIcon: { color: 'rgba(0,240,255,0.5)', fontSize: 16 },
});
