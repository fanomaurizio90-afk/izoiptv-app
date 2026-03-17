import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, TextInput, BackHandler, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { xtream, getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

const CARD_W = 130;
const CARD_H = 190;

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
        {item.rating ? <Text style={styles.cardRating}>★ {parseFloat(item.rating).toFixed(1)}</Text> : null}
      </View>
      {focused && <View style={styles.focusRing} />}
    </Pressable>
  );
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

export default function MoviesScreen({ navigation }) {
  const { xtreamConfig } = useAuth();
  const [categories, setCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState('');
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const searchRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { navigation.goBack(); return true; });
      return () => sub.remove();
    }, [])
  );

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const cats = await xtream.getVODCategories();
      setCategories(cats);
      if (cats.length) {
        setSelectedCat(cats[0].category_id);
        loadMoviesForCategory(cats[0].category_id);
      }
    } catch (e) {
      console.warn('Movies categories error:', e.message);
    } finally {
      setLoadingCats(false);
    }
  };

  const loadMoviesForCategory = async (categoryId) => {
    setLoadingMovies(true);
    setMovies([]);
    setSearch('');
    searchRef.current = '';
    try {
      const vods = await xtream.getVODStreams(categoryId);
      setMovies(vods);
    } catch (e) {
      console.warn('Movies load error:', e.message);
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleCatSelect = (catId) => {
    if (catId === selectedCat) return;
    setSelectedCat(catId);
    loadMoviesForCategory(catId);
  };

  const handlePlay = (item) => {
    if (!xtreamConfig) return;
    const url = getXtreamStreamUrl(xtreamConfig.server, xtreamConfig.username, xtreamConfig.password, item.stream_id, 'movie', 'mp4');
    navigation.navigate('Player', { stream: { ...item, streamType: 'vod', url } });
  };

  const filtered = search
    ? movies.filter(m => (m.name || '').toLowerCase().includes(search.toLowerCase()))
    : movies;

  if (loadingCats) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color="#00f0ff" size="large" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

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

      {/* Main grid */}
      <View style={styles.main}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search in category..."
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
        </View>

        {loadingMovies ? (
          <View style={styles.fullCenter}>
            <ActivityIndicator color="#00f0ff" size="large" />
            <Text style={styles.loadingText}>Loading movies...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            numColumns={Math.floor((require('react-native').Dimensions.get('window').width - 200 - 32) / (CARD_W + 12))}
            keyExtractor={item => String(item.stream_id)}
            renderItem={({ item }) => (
              <MovieCard item={item} onPress={() => handlePlay(item)} />
            )}
            contentContainerStyle={styles.grid}
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
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
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
  main: { flex: 1 },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)' },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    color: '#fff', fontSize: 13,
  },
  grid: { padding: 12, paddingBottom: 40, gap: 12 },
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#0d0d1a',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    margin: 6,
  },
  cardFocused: { borderColor: '#00f0ff', shadowColor: '#00f0ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 10 },
  cardPoster: { ...StyleSheet.absoluteFillObject },
  cardPlaceholder: { backgroundColor: '#0a0a1f', alignItems: 'center', justifyContent: 'center' },
  placeholderLetter: { color: 'rgba(0,240,255,0.3)', fontSize: 42, fontWeight: '900' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  cardInfo: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  cardTitle: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  cardRating: { color: 'rgba(0,240,255,0.7)', fontSize: 9, marginTop: 2 },
  focusRing: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: '#00f0ff', borderRadius: 10 },
});
