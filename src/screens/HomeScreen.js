import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Animated, Dimensions, Image, StatusBar,
  BackHandler, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { xtream } from '../services/xtream';
import { storage } from '../services/storage';
import ContentRow from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatExpiry, daysUntil, isExpiringSoon } from '../utils/helpers';

const { width, height } = Dimensions.get('window');
const IS_TV = Platform.isTV;

// Nav items
const NAV_ITEMS = [
  { id: 'home',    label: 'HOME',     icon: '⌂' },
  { id: 'live',    label: 'LIVE TV',  icon: '📡', screen: 'LiveTV' },
  { id: 'movies',  label: 'MOVIES',   icon: '🎬', screen: 'Movies' },
  { id: 'series',  label: 'SERIES',   icon: '📺', screen: 'Series' },
  { id: 'search',  label: 'SEARCH',   icon: '🔍', screen: 'Search' },
  { id: 'settings',label: 'SETTINGS', icon: '⚙', screen: 'Settings' },
];

function NavBar({ active, onSelect }) {
  return (
    <View style={styles.navBar}>
      {/* Logo */}
      <View style={styles.navLogo}>
        <Text style={styles.navLogoText}>IZO</Text>
        <Text style={styles.navLogoSub}>IPTV</Text>
      </View>
      <View style={styles.navDivider} />
      {/* Nav items */}
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.id}
          item={item}
          isActive={active === item.id}
          onPress={() => onSelect(item)}
        />
      ))}
    </View>
  );
}

function NavItem({ item, isActive, onPress }) {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, speed: 30 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Pressable onPress={onPress} onFocus={onFocus} onBlur={onBlur}>
      <Animated.View
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
          focused && styles.navItemFocused,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.navIcon}>{item.icon}</Text>
        <Text style={[styles.navLabel, (isActive || focused) && styles.navLabelActive]}>
          {item.label}
        </Text>
        {isActive && <View style={styles.navActiveBar} />}
      </Animated.View>
    </Pressable>
  );
}

function HeroBanner({ liveChannels, onPlay }) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Rotate featured channels every 8s
  useEffect(() => {
    if (!liveChannels.length) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setIdx(i => (i + 1) % Math.min(5, liveChannels.length));
    }, 8000);
    return () => clearInterval(interval);
  }, [liveChannels]);

  const featured = liveChannels[idx];
  if (!featured) return (
    <View style={styles.heroPlaceholder}>
      <LinearGradient colors={['rgba(0,240,255,0.05)', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <Text style={styles.heroPlaceholderText}>Loading channels...</Text>
    </View>
  );

  return (
    <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
      {featured.stream_icon ? (
        <Image source={{ uri: featured.stream_icon }} style={styles.heroBg} resizeMode="cover" blurRadius={8} />
      ) : (
        <View style={[styles.heroBg, { backgroundColor: '#0a0a1f' }]} />
      )}
      <LinearGradient
        colors={['rgba(3,3,8,0.2)', 'rgba(3,3,8,0.7)', '#030308']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.heroContent}>
        <View style={styles.liveTag}>
          <View style={styles.livePulse} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{featured.name}</Text>
        <Text style={styles.heroCat}>{featured.category_name || 'Live TV'}</Text>
        <View style={styles.heroActions}>
          <Pressable
            onPress={() => onPlay(featured)}
            hasTVPreferredFocus={IS_TV}
            style={({ focused }) => [styles.heroBtn, focused && styles.heroBtnFocused]}
          >
            <LinearGradient colors={['#00c8d4', '#00f0ff']} style={styles.heroBtnGrad}>
              <Text style={styles.heroBtnText}>▶  WATCH NOW</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, xtreamConfig, logout, refreshConfig } = useAuth();
  const [activeNav, setActiveNav] = useState('home');
  const [loading, setLoading] = useState(true);
  const [liveChannels, setLiveChannels] = useState([]);
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [recentlyWatched, setRecentlyWatched] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadContent();
      loadRecentlyWatched();

      // Handle back button on TV (long press = exit)
      if (Platform.OS === 'android') {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
          // On home screen, back press does nothing (or prompts exit)
          return true;
        });
        return () => sub.remove();
      }
    }, [])
  );

  const loadContent = async () => {
    setLoading(true);
    try {
      // Refresh config from server on each load
      await refreshConfig();
      const [live, vod, ser] = await Promise.allSettled([
        xtream.getLiveStreams(),
        xtream.getVODStreams(),
        xtream.getSeries(),
      ]);
      if (live.status === 'fulfilled') setLiveChannels(live.value.slice(0, 100));
      if (vod.status === 'fulfilled') setMovies(vod.value.slice(0, 60));
      if (ser.status === 'fulfilled') setSeries(ser.value.slice(0, 60));
    } catch (e) {
      console.warn('Failed to load content:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentlyWatched = async () => {
    const items = await storage.getRecentlyWatched();
    setRecentlyWatched(items.slice(0, 20));
  };

  const handleNavSelect = (item) => {
    if (item.id === 'home') { setActiveNav('home'); return; }
    if (item.screen) navigation.navigate(item.screen);
  };

  const handlePlay = (stream) => {
    navigation.navigate('Player', { stream: { ...stream, streamType: 'live' } });
  };

  const expiryDays = daysUntil(user?.subscriptionExpiry);
  const expiringSoon = isExpiringSoon(user?.subscriptionExpiry);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030308" />

      {/* Sidebar nav (TV style) */}
      <NavBar active={activeNav} onSelect={handleNavSelect} />

      {/* Main content */}
      <View style={styles.main}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <LoadingSpinner size={52} label="Loading content..." />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Subscription warning */}
            {expiringSoon && (
              <View style={styles.expiryBanner}>
                <Text style={styles.expiryText}>
                  ⚠ Subscription expires in {expiryDays} day{expiryDays !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Hero */}
            <HeroBanner liveChannels={liveChannels} onPlay={handlePlay} />

            {/* Recently watched */}
            {recentlyWatched.length > 0 && (
              <ContentRow
                title="Continue Watching"
                items={recentlyWatched}
                onItemPress={(item) => navigation.navigate('Player', { stream: item })}
                accent="#a855f7"
              />
            )}

            {/* Live TV row */}
            <ContentRow
              title="Live TV"
              items={liveChannels.map(c => ({ ...c, type: 'live' }))}
              onItemPress={(item) => navigation.navigate('Player', { stream: { ...item, streamType: 'live' } })}
              accent="#00f0ff"
            />

            {/* Movies row */}
            <ContentRow
              title="Movies"
              items={movies}
              onItemPress={(item) => navigation.navigate('Player', { stream: { ...item, streamType: 'vod' } })}
              accent="#a855f7"
            />

            {/* Series row */}
            <ContentRow
              title="Series"
              items={series}
              onItemPress={(item) => navigation.navigate('Series', { seriesId: item.series_id, seriesInfo: item })}
              accent="#00f0ff"
            />

            {/* Quick stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Channels', value: liveChannels.length + '+' },
                { label: 'Movies', value: movies.length + '+' },
                { label: 'Series', value: series.length + '+' },
                { label: 'Expires', value: `${expiryDays}d` },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* User info footer */}
            <View style={styles.userFooter}>
              <Text style={styles.userText}>Signed in as <Text style={styles.userHighlight}>{user?.username}</Text></Text>
              <Pressable onPress={logout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>SIGN OUT</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030308',
    flexDirection: 'row',
  },
  // Sidebar
  navBar: {
    width: 180,
    backgroundColor: '#050510',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,240,255,0.08)',
    paddingTop: 24,
    paddingBottom: 24,
    gap: 4,
  },
  navLogo: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 4,
  },
  navLogoText: {
    color: '#00f0ff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: '#00f0ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  navLogoSub: {
    color: 'rgba(0,240,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
  },
  navDivider: {
    height: 1,
    backgroundColor: 'rgba(0,240,255,0.1)',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 8,
    gap: 10,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(0,240,255,0.08)',
  },
  navItemFocused: {
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.4)',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  navIcon: { fontSize: 18 },
  navLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
  },
  navLabelActive: { color: '#00f0ff' },
  navActiveBar: {
    position: 'absolute',
    right: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    backgroundColor: '#00f0ff',
    borderRadius: 2,
  },
  // Main
  main: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  // Expiry banner
  expiryBanner: {
    backgroundColor: 'rgba(251,146,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.3)',
    margin: 16,
    borderRadius: 10,
    padding: 12,
  },
  expiryText: { color: '#fb923c', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  // Hero
  hero: {
    height: height * 0.45,
    marginBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPlaceholder: {
    height: height * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a1f',
    marginBottom: 32,
  },
  heroPlaceholderText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 32,
    right: 32,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f0ff',
  },
  liveTagText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroCat: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  heroActions: { flexDirection: 'row', gap: 12 },
  heroBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroBtnFocused: {
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  heroBtnGrad: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  heroBtnText: {
    color: '#030308',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#00f0ff',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,240,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // User footer
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,255,0.08)',
    marginTop: 8,
  },
  userText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  userHighlight: { color: '#00f0ff', fontWeight: '700' },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
