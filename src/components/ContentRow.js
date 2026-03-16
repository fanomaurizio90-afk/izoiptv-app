import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Pressable, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

function ContentCard({ item, onPress, index }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);

  const onFocus = () => {
    setFocused(true);
    Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 25 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25 }).start();
  };

  const isLandscape = item.type === 'live';
  const cardW = isLandscape ? 200 : 130;
  const cardH = isLandscape ? 112 : 195;

  return (
    <Pressable onPress={onPress} onFocus={onFocus} onBlur={onBlur} style={styles.cardWrap}>
      <Animated.View
        style={[
          styles.card,
          { width: cardW, height: cardH },
          focused && styles.cardFocused,
          { transform: [{ scale }] },
        ]}
      >
        {item.stream_icon || item.cover || item.backdrop_path ? (
          <Image
            source={{ uri: item.stream_icon || item.cover || item.backdrop_path }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cardPlaceholder]}>
            <Text style={styles.placeholderText}>{(item.name || item.title || '?')[0]}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(3,3,8,0.95)']}
          style={styles.cardGradient}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name || item.title}</Text>
          {item.num && <Text style={styles.cardSub}>CH {item.num}</Text>}
          {item.rating && <Text style={styles.cardSub}>★ {parseFloat(item.rating).toFixed(1)}</Text>}
        </View>
        {focused && <View style={styles.focusRing} />}
      </Animated.View>
    </Pressable>
  );
}

export default function ContentRow({ title, items = [], onItemPress, accent = '#00f0ff' }) {
  if (!items.length) return null;

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowCount}>{items.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.slice(0, 30).map((item, i) => (
          <ContentCard
            key={item.stream_id || item.vod_id || item.series_id || i}
            item={item}
            index={i}
            onPress={() => onItemPress?.(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 32,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  rowCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  cardWrap: {},
  card: {
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
  cardPlaceholder: {
    backgroundColor: '#0a0a1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(0,240,255,0.3)',
    fontSize: 36,
    fontWeight: '900',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardSub: {
    color: 'rgba(0,240,255,0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#00f0ff',
    borderRadius: 10,
  },
});
