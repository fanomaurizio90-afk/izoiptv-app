import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  Animated, Dimensions, StatusBar,
  BackHandler, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { daysUntil, isExpiringSoon } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

// ─── DESIGN TOKENS (exact from izoiptv.com) ──────────────────────────────────
const C = {
  bg:        '#030308',
  cyan:      '#00f0ff',
  purple:    '#a855f7',
  cyanDim:   'rgba(0,240,255,0.08)',
  cyanBorder:'rgba(0,240,255,0.2)',
  cyanGlow:  'rgba(0,240,255,0.15)',
  purpleDim: 'rgba(168,85,247,0.08)',
  purpleBorder:'rgba(168,85,247,0.25)',
  white:     '#ffffff',
  white80:   'rgba(255,255,255,0.8)',
  white50:   'rgba(255,255,255,0.5)',
  white30:   'rgba(255,255,255,0.3)',
  white10:   'rgba(255,255,255,0.1)',
  dark1:     '#050510',
  dark2:     '#0a0a1f',
};

// ─── IZO HEX LOGO (replicates the hexagonal logo from izoiptv.com) ────────────
function IZOLogo({ size = 52 }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer hex border (approximated with rotated square + corner radius) */}
      <View style={[styles.hexOuter, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <LinearGradient
          colors={[C.cyan, C.purple]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      {/* Inner dark fill */}
      <View style={[styles.hexInner, {
        width: size - 3, height: size - 3, borderRadius: (size - 3) * 0.28,
      }]} />
      {/* Glow pulse */}
      <Animated.View style={[
        styles.hexGlow,
        { width: size + 8, height: size + 8, borderRadius: (size + 8) * 0.3, opacity: pulse },
      ]} />
      {/* IZO text */}
      <Text style={[styles.hexText, { fontSize: size * 0.32 }]}>IZO</Text>
      <Text style={[styles.hexSubText, { fontSize: size * 0.14 }]}>IPTV</Text>
    </View>
  );
}

// ─── CYBER GRID BACKGROUND ────────────────────────────────────────────────────
function CyberGrid() {
  const lines = [];
  const step = 60;
  // Horizontal lines
  for (let y = 0; y < height * 1.5; y += step) {
    lines.push(<View key={`h${y}`} style={[styles.gridLine, { top: y, left: 0, right: 0, height: 1 }]} />);
  }
  // Vertical lines
  for (let x = 0; x < width; x += step) {
    lines.push(<View key={`v${x}`} style={[styles.gridLine, { left: x, top: 0, bottom: 0, width: 1 }]} />);
  }
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {lines}
      {/* Fade edges */}
      <LinearGradient
        colors={['transparent', C.bg]}
        style={[StyleSheet.absoluteFillObject, { top: '60%' }]}
      />
    </View>
  );
}

// ─── AMBIENT ORBS ─────────────────────────────────────────────────────────────
function AmbientOrbs() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 12000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const orb1Y = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb2Y = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: orb1Y }] }]}>
        <LinearGradient
          colors={['rgba(0,240,255,0.12)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: orb2Y }] }]}>
        <LinearGradient
          colors={['rgba(168,85,247,0.1)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

// ─── LIVE TV ILLUSTRATION ─────────────────────────────────────────────────────
function LiveTVArt() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.artContainer}>
      {/* Signal arcs */}
      {[52, 36, 20].map((size, i) => (
        <View key={i} style={[styles.signalArc, {
          width: size, height: size / 2,
          borderTopLeftRadius: size, borderTopRightRadius: size,
          borderColor: `rgba(0,240,255,${0.25 + i * 0.2})`,
          bottom: 40 + i * 14,
        }]} />
      ))}
      {/* Tower */}
      <View style={styles.towerBase}>
        <LinearGradient colors={[C.cyan, 'rgba(0,240,255,0.3)']}
          style={styles.towerBody} />
        {/* Platform */}
        <View style={styles.towerPlatform} />
      </View>
      {/* Live dot */}
      <Animated.View style={[styles.liveDotArt, { opacity: pulse }]} />
      {/* Base stand */}
      <View style={styles.towerStand} />
      <View style={styles.towerFeet} />
    </View>
  );
}

// ─── MOVIES ILLUSTRATION ──────────────────────────────────────────────────────
function MoviesArt() {
  return (
    <View style={styles.artContainer}>
      {/* Clapperboard body */}
      <LinearGradient
        colors={['rgba(168,85,247,0.25)', 'rgba(168,85,247,0.08)']}
        style={styles.clapBody}
      >
        {/* Film holes row */}
        <View style={styles.filmHoles}>
          {[0,1,2,3,4].map(i => (
            <View key={i} style={styles.filmHole} />
          ))}
        </View>
        {/* Play icon */}
        <View style={styles.playTriangle} />
      </LinearGradient>
      {/* Slate / top bar */}
      <LinearGradient
        colors={[C.purple, 'rgba(168,85,247,0.6)']}
        style={styles.clapSlate}
      >
        {/* Stripes */}
        {[0,1,2,3].map(i => (
          <View key={i} style={[styles.clapStripe, {
            backgroundColor: i % 2 === 0 ? 'rgba(0,240,255,0.5)' : 'rgba(3,3,8,0.6)',
          }]} />
        ))}
      </LinearGradient>
      {/* Hinge line */}
      <View style={styles.clapHinge} />
      {/* Stars */}
      {[[-18, -10], [16, -14], [-8, 8]].map(([x, y], i) => (
        <Text key={i} style={[styles.star, { marginLeft: x, marginTop: y, opacity: 0.6 + i * 0.1 }]}>★</Text>
      ))}
    </View>
  );
}

// ─── SERIES ILLUSTRATION ──────────────────────────────────────────────────────
function SeriesArt() {
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(scan, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });

  return (
    <View style={styles.artContainer}>
      {/* TV body */}
      <View style={styles.tvBody}>
        {/* Screen */}
        <LinearGradient
          colors={['rgba(0,10,20,0.95)', 'rgba(0,30,50,0.9)']}
          style={styles.tvScreen}
        >
          {/* Scan line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]} />
          {/* Screen lines */}
          {[0,1,2].map(i => (
            <View key={i} style={[styles.screenLine, { top: 8 + i * 12, opacity: 0.3 - i * 0.08 }]} />
          ))}
          {/* Play indicator */}
          <View style={styles.tvPlayBtn}>
            <Text style={styles.tvPlayText}>▶</Text>
          </View>
        </LinearGradient>
        {/* Screen glow */}
        <LinearGradient
          colors={['rgba(0,240,255,0.08)', 'transparent']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 6 }]}
        />
      </View>
      {/* Stand */}
      <View style={styles.tvStand} />
      <View style={styles.tvFeet} />
      {/* Side speakers */}
      {[-1, 1].map(side => (
        <View key={side} style={[styles.tvSpeaker, {
          left: side === -1 ? -12 : undefined,
          right: side === 1 ? -12 : undefined,
        }]} />
      ))}
    </View>
  );
}

// ─── MAIN TILE ────────────────────────────────────────────────────────────────
function MainTile({ label, onPress, illustration: Art, accentColor, borderColor, glowColor, hasTVPreferredFocus }) {
  const [focused, setFocused] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1.04, useNativeDriver: true, speed: 25, bounciness: 4 }),
    ]).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 25 }),
    ]).start();
  };

  const borderOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.3] });

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.tilePressable}
    >
      <Animated.View style={[styles.tile, { transform: [{ scale: scaleAnim }] }]}>
        {/* Animated border */}
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          styles.tileBorderAnim,
          { borderColor: accentColor, opacity: borderOpacity },
        ]} />

        {/* Background gradient */}
        <LinearGradient
          colors={[`${accentColor}12`, `${accentColor}04`, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
        />

        {/* Illustration */}
        <View style={styles.tileIllustration}>
          <Art />
        </View>

        {/* Bottom overlay gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(3,3,8,0.85)', C.bg]}
          style={styles.tileOverlay}
        />

        {/* Label */}
        <View style={styles.tileLabelWrap}>
          <Text style={[styles.tileLabel, focused && { color: accentColor }]}>
            {label}
          </Text>
          <View style={[styles.tileLabelBar, { backgroundColor: accentColor, opacity: focused ? 1 : 0 }]} />
        </View>

        {/* Focused glow edge */}
        {focused && (
          <LinearGradient
            colors={[`${accentColor}30`, 'transparent']}
            start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, logout, refreshConfig } = useAuth();

  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(false);
      refreshConfig().catch(() => {});

      if (Platform.OS === 'android') {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
      }
    }, [])
  );

  const expiryDays = daysUntil(user?.subscriptionExpiry);
  const expiringSoon = isExpiringSoon(user?.subscriptionExpiry);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Ambient background */}
      <CyberGrid />
      <AmbientOrbs />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        {/* Left: Logo */}
        <View style={styles.headerLogo}>
          <IZOLogo size={48} />
          <View style={styles.headerLogoText}>
            <Text style={styles.headerBrand}>IZO IPTV</Text>
            <Text style={styles.headerTagline}>Premium Streaming</Text>
          </View>
        </View>

        {/* Right: user info + settings */}
        <View style={styles.headerRight}>
          {expiringSoon && (
            <View style={styles.expiryBadge}>
              <Text style={styles.expiryBadgeText}>⚠ {expiryDays}d left</Text>
            </View>
          )}
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ focused }) => [styles.gearBtn, focused && styles.gearBtnFocused]}
          >
            <Text style={styles.gearIcon}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* ── HEADER DIVIDER ── */}
      <LinearGradient
        colors={[C.cyan + '40', C.purple + '20', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.headerDivider}
      />

      {/* ── WELCOME ── */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeText}>
          Welcome back, <Text style={styles.welcomeName}>{user?.username}</Text>
        </Text>
        <Text style={styles.welcomeSub}>What would you like to watch today?</Text>
      </View>

      {/* ── 3 MAIN TILES ── */}
      <View style={styles.tilesRow}>
        <MainTile
          label="LIVE TV"
          onPress={() => navigation.navigate('LiveTV')}
          illustration={LiveTVArt}
          accentColor={C.cyan}
          hasTVPreferredFocus
        />
        <MainTile
          label="MOVIES"
          onPress={() => navigation.navigate('Movies')}
          illustration={MoviesArt}
          accentColor={C.purple}
        />
        <MainTile
          label="SERIES"
          onPress={() => navigation.navigate('Series')}
          illustration={SeriesArt}
          accentColor={C.cyan}
        />
      </View>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <LinearGradient
          colors={[C.cyan + '20', C.purple + '15']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.footerPill}
        >
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>
            Subscription active
            {expiryDays > 0 ? ` · ${expiryDays} days remaining` : ''}
          </Text>
        </LinearGradient>

        <Pressable
          onPress={logout}
          style={({ focused }) => [styles.logoutBtn, focused && styles.logoutBtnFocused]}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Grid / orbs
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0,240,255,0.04)',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  orb1: {
    width: 380,
    height: 380,
    top: -80,
    left: -60,
  },
  orb2: {
    width: 300,
    height: 300,
    bottom: 40,
    right: -40,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerLogoText: {
    gap: 2,
  },
  headerBrand: {
    color: C.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerTagline: {
    color: C.white30,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expiryBadge: {
    backgroundColor: 'rgba(251,146,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expiryBadgeText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '700',
  },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    backgroundColor: C.cyanDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBtnFocused: {
    borderColor: C.cyan,
    backgroundColor: 'rgba(0,240,255,0.15)',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  gearIcon: {
    color: C.cyan,
    fontSize: 20,
  },
  headerDivider: {
    height: 1,
    marginHorizontal: 0,
  },

  // ── Welcome
  welcome: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  welcomeText: {
    color: C.white50,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  welcomeName: {
    color: C.cyan,
    fontWeight: '800',
  },
  welcomeSub: {
    color: C.white30,
    fontSize: 12,
    marginTop: 3,
    letterSpacing: 1,
  },

  // ── Tiles
  tilesRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 20,
    zIndex: 10,
  },
  tilePressable: {
    flex: 1,
  },
  tile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBorderAnim: {
    borderRadius: 20,
    borderWidth: 1,
  },
  tileIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  tileLabelWrap: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 6,
  },
  tileLabel: {
    color: C.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tileLabelBar: {
    width: 32,
    height: 2,
    borderRadius: 1,
  },

  // ── Hex logo
  hexOuter: {
    position: 'absolute',
    overflow: 'hidden',
  },
  hexInner: {
    position: 'absolute',
    backgroundColor: C.dark2,
    margin: 2,
  },
  hexGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,240,255,0.06)',
  },
  hexText: {
    position: 'absolute',
    color: C.cyan,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: C.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 8,
  },
  hexSubText: {
    position: 'absolute',
    color: 'rgba(0,240,255,0.5)',
    fontWeight: '700',
    letterSpacing: 3,
    bottom: '20%',
  },

  // ── Live TV art
  artContainer: {
    width: 100,
    height: 110,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  signalArc: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderBottomWidth: 0,
  },
  towerBase: {
    width: 6,
    height: 48,
    alignItems: 'center',
    marginBottom: 4,
  },
  towerBody: {
    width: 4,
    flex: 1,
    borderRadius: 2,
  },
  towerPlatform: {
    width: 20,
    height: 3,
    backgroundColor: 'rgba(0,240,255,0.5)',
    borderRadius: 2,
    marginTop: -2,
  },
  liveDotArt: {
    position: 'absolute',
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  towerStand: {
    width: 28,
    height: 3,
    backgroundColor: 'rgba(0,240,255,0.3)',
    borderRadius: 2,
  },
  towerFeet: {
    width: 44,
    height: 2,
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderRadius: 1,
    marginTop: 2,
  },

  // ── Movies art
  clapBody: {
    width: 80,
    height: 54,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    marginTop: 20,
  },
  filmHoles: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    top: 6,
  },
  filmHole: {
    width: 8,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
    backgroundColor: 'rgba(3,3,8,0.8)',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(168,85,247,0.7)',
  },
  clapSlate: {
    position: 'absolute',
    top: 0,
    width: 80,
    height: 20,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  clapStripe: {
    flex: 1,
  },
  clapHinge: {
    position: 'absolute',
    top: 19,
    width: 80,
    height: 2,
    backgroundColor: 'rgba(0,240,255,0.5)',
  },
  star: {
    position: 'absolute',
    color: C.purple,
    fontSize: 14,
    fontWeight: '900',
  },

  // ── Series art
  tvBody: {
    width: 88,
    height: 60,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0,240,255,0.4)',
    backgroundColor: '#050510',
    overflow: 'hidden',
    padding: 4,
  },
  tvScreen: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,240,255,0.25)',
  },
  screenLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: 'rgba(0,240,255,0.3)',
  },
  tvPlayBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,240,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvPlayText: {
    color: C.cyan,
    fontSize: 9,
    fontWeight: '900',
  },
  tvStand: {
    width: 8,
    height: 10,
    backgroundColor: 'rgba(0,240,255,0.25)',
    alignSelf: 'center',
  },
  tvFeet: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,240,255,0.2)',
    alignSelf: 'center',
  },
  tvSpeaker: {
    position: 'absolute',
    width: 8,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    top: 15,
  },

  // ── Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,255,0.06)',
    zIndex: 10,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  footerText: {
    color: C.white50,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoutBtnFocused: {
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoutText: {
    color: C.white30,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
