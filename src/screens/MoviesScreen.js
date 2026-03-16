import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, TextInput, BackHandler, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { xtream } from '../services/xtream';
import { getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { truncate } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CARD_W = 140;
const CARD_H = 200;
const NUM_COLS = Math.floor((width - 180 - 48) / (CARD_W + 12));

function MovieCard({ item, onPress }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.card, focused && styles.cardFocused]}
    >
      {item.stream_icon ? (
        <Image source={{ uri: item.stream_icon }} style={styles.cardPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.cardPoster, styles.cardPlaceholder]}>
          <Text style={styles.placeholderLetter}>{(item.name || '?')[0]}</Text>
        </View>
      )}
      <LinearGradient colors={['transparent', 'rgba(3,3,8,0.98)']} style={styles.cardGrad} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
        {item.rating && <Text style={styles.cardRating}>★ {parseFloat(item.rating || 0).toFixed(1)}</Text>}
      </View>
      {focused && <View style={styles.focusRing} />}
    </Pressable>
  );
}

export default function MoviesScreen({ navigation }) {
  const { xtreamConfig } = useAuth();
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { navigation.goBack(); return true; });
      return () => sub.remove();
    }, [])
  );

  const load = async () => {
    setLoading(true);
    try {
      const [cats, vods] = await Promise.all([
        xtream.getVODCategories(),
        xtream.getVODStreams(),
      ]);
      setCategories(cats);
      setMovies(vods);
      setFiltered(vods);
    } catch (e) {
      console.warn('Movies load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const filterMovies = useCallback((catId, q) => {
    let result = movies;
    if (catId) result = result.filter(m => m.category_id === catId);
    if (q) result = xtream.search(result, q);
    setFiltered(result);
  }, [movies]);

  const handleCat = (catId) => {
    setSelectedCat(catId);
    filterMovies(catId, search);
  };

  const handleSearch = (q) => {
    setSearch(q);
    filterMovies(selectedCat, q);
  };

  const handlePlay = (item) => {
    if (!xtreamConfig) return;
    const url = getXtreamStreamUrl(xtreamConfig.server, xtreamConfig.username, xtreamConfig.password, item.stream_id, 'movie', 'mp4');
    navigation.navigate('Player', { stream: { ...item, streamType: 'vod', url } });
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <LoadingSpinner size={52} label="Loading movies..." />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.sideTitle}>MOVIES</Text>
        <Text style={styles.sideCount}>{filtered.length} titles</Text>
        <View style={styles.sideDivider} />
        <Pressable
          onPress={() => handleCat(null)}
          style={[styles.catBtn, !selectedCat && styles.catBtnActive]}
        >
          <Text style={[styles.catBtnText, !selectedCat && styles.catBtnTextActive]}>All Movies</Text>
        </Pressable>
        {categories.slice(0, 20).map(cat => (
          <Pressable
            key={cat.category_id}
            onPress={() => handleCat(cat.category_id)}
            style={[styles.catBtn, selectedCat === cat.category_id && styles.catBtnActive]}
          >
            <Text style={[styles.catBtnText, selectedCat === cat.category_id && styles.catBtnTextActive]} numberOfLines={1}>
              {cat.category_name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Main */}
      <View style={styles.main}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search movies..."
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
        </View>

        <FlatList
          data={filtered}
          numColumns={NUM_COLS}
          keyExtractor={item => String(item.stream_id)}
          renderItem={({ item }) => (
            <MovieCard item={item} onPress={() => handlePlay(item)} />
          )}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={NUM_COLS > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308', flexDirection: 'row' },
  loadingWrap: { flex: 1, backgroundColor: '#030308', alignItems: 'center', justifyContent: 'center' },
  sidebar: {
    width: 180,
    backgroundColor: '#050510',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,240,255,0.08)',
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: '#00f0ff', fontSize: 13, fontWeight: '700' },
  sideTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  sideCount: { color: 'rgba(0,240,255,0.5)', fontSize: 11, marginBottom: 12 },
  sideDivider: { height: 1, backgroundColor: 'rgba(0,240,255,0.08)', marginBottom: 12 },
  catBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  catBtnActive: { backgroundColor: 'rgba(0,240,255,0.1)', borderLeftWidth: 2, borderLeftColor: '#00f0ff' },
  catBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  catBtnTextActive: { color: '#00f0ff' },
  main: { flex: 1, paddingTop: 0 },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,240,255,0.08)',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  grid: { padding: 16, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0d0d1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardFocused: {
    borderColor: '#00f0ff',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  cardPoster: { ...StyleSheet.absoluteFillObject },
  cardPlaceholder: {
    backgroundColor: '#0a0a1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: { color: 'rgba(0,240,255,0.3)', fontSize: 48, fontWeight: '900' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  cardInfo: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  cardTitle: { color: '#ffffff', fontSize: 11, fontWeight: '700', lineHeight: 15 },
  cardRating: { color: 'rgba(0,240,255,0.7)', fontSize: 10, marginTop: 2 },
  focusRing: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: '#00f0ff', borderRadius: 10 },
});
