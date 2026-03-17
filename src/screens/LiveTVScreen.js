import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Image, Animated, BackHandler, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { xtream, getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

const ITEM_HEIGHT = 68;

function ChannelItem({ item, isSelected, onPress }) {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.spring(scale, { toValue: 1.02, useNativeDriver: true, speed: 40 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  return (
    <Pressable onPress={onPress} onFocus={onFocus} onBlur={onBlur}>
      <Animated.View style={[
        styles.channelItem,
        isSelected && styles.channelItemSelected,
        focused && styles.channelItemFocused,
        { transform: [{ scale }] },
      ]}>
        {item.stream_icon ? (
          <Image source={{ uri: item.stream_icon }} style={styles.chLogo} resizeMode="contain" />
        ) : (
          <View style={styles.chLogoPlaceholder}>
            <Text style={styles.chLogoLetter}>{(item.name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.chInfo}>
          <Text style={styles.chName} numberOfLines={1}>{item.name}</Text>
          {item.num ? <Text style={styles.chNum}>CH {item.num}</Text> : null}
        </View>
        {(isSelected || focused) && <View style={styles.selectedDot} />}
      </Animated.View>
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
      style={[styles.catItem, isSelected && styles.catItemSelected, focused && styles.catItemFocused]}
    >
      <Text style={[styles.catName, isSelected && styles.catNameSelected]} numberOfLines={2}>
        {item.category_name}
      </Text>
    </Pressable>
  );
}

export default function LiveTVScreen({ navigation }) {
  const { xtreamConfig } = useAuth();
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const cats = await xtream.getLiveCategories();
      setCategories(cats);
      if (cats.length) {
        // Auto-select first category
        loadChannelsForCategory(cats[0].category_id);
        setSelectedCat(cats[0].category_id);
      }
    } catch (e) {
      console.warn('LiveTV categories error:', e.message);
    } finally {
      setLoadingCats(false);
    }
  };

  const loadChannelsForCategory = async (categoryId) => {
    setLoadingChannels(true);
    setChannels([]);
    setSelectedChannel(null);
    try {
      const chans = await xtream.getLiveStreams(categoryId);
      setChannels(chans);
      if (chans.length) setSelectedChannel(chans[0]);
    } catch (e) {
      console.warn('LiveTV channels error:', e.message);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleCategorySelect = (catId) => {
    if (catId === selectedCat) return;
    setSelectedCat(catId);
    loadChannelsForCategory(catId);
  };

  const handlePlay = (channel) => {
    if (!channel || !xtreamConfig) return;
    const url = getXtreamStreamUrl(
      xtreamConfig.server,
      xtreamConfig.username,
      xtreamConfig.password,
      channel.stream_id,
      'live',
      'ts'
    );
    navigation.navigate('Player', { stream: { ...channel, streamType: 'live', url } });
  };

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
      {/* Category sidebar */}
      <View style={styles.catPane}>
        <View style={styles.catHeader}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>←</Text>
          </Pressable>
          <Text style={styles.catHeaderTitle}>LIVE TV</Text>
        </View>
        <FlatList
          data={categories}
          keyExtractor={item => String(item.category_id)}
          renderItem={({ item }) => (
            <CategoryItem
              item={item}
              isSelected={selectedCat === item.category_id}
              onPress={() => handleCategorySelect(item.category_id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={5}
        />
      </View>

      {/* Channel list */}
      <View style={styles.channelPane}>
        {loadingChannels ? (
          <View style={styles.fullCenter}>
            <ActivityIndicator color="#00f0ff" size="small" />
            <Text style={styles.loadingText}>Loading channels...</Text>
          </View>
        ) : (
          <FlatList
            data={channels}
            keyExtractor={item => String(item.stream_id)}
            renderItem={({ item }) => (
              <ChannelItem
                item={item}
                isSelected={selectedChannel?.stream_id === item.stream_id}
                onPress={() => setSelectedChannel(item)}
              />
            )}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={7}
            removeClippedSubviews
          />
        )}
      </View>

      {/* Preview / play pane */}
      <View style={styles.previewPane}>
        {selectedChannel ? (
          <View style={styles.preview}>
            {selectedChannel.stream_icon ? (
              <Image source={{ uri: selectedChannel.stream_icon }} style={styles.previewLogo} resizeMode="contain" />
            ) : (
              <View style={styles.previewLogoPlaceholder}>
                <Text style={styles.previewLogoLetter}>{(selectedChannel.name || '?')[0]}</Text>
              </View>
            )}
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.previewName}>{selectedChannel.name}</Text>
            {selectedChannel.num ? (
              <Text style={styles.previewNum}>Channel {selectedChannel.num}</Text>
            ) : null}
            <Pressable
              style={({ focused }) => [styles.playBtn, focused && styles.playBtnFocused]}
              onPress={() => handlePlay(selectedChannel)}
              hasTVPreferredFocus
            >
              <Text style={styles.playBtnText}>▶  WATCH NOW</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.fullCenter}>
            <Text style={styles.selectHint}>Select a channel</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308', flexDirection: 'row' },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // Category pane
  catPane: {
    width: 200,
    backgroundColor: '#040410',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,240,255,0.08)',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,240,255,0.08)',
  },
  backBtn: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  catHeaderTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  catItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  catItemSelected: {
    borderLeftColor: '#00f0ff',
    backgroundColor: 'rgba(0,240,255,0.06)',
  },
  catItemFocused: {
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderLeftColor: '#00f0ff',
  },
  catName: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  catNameSelected: { color: '#00f0ff' },

  // Channel pane
  channelPane: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,240,255,0.08)',
    backgroundColor: '#050510',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  channelItemSelected: {
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#00f0ff',
  },
  channelItemFocused: {
    backgroundColor: 'rgba(0,240,255,0.12)',
  },
  chLogo: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#0d0d1a' },
  chLogoPlaceholder: {
    width: 36, height: 36, borderRadius: 6,
    backgroundColor: '#0d0d1a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.1)',
  },
  chLogoLetter: { color: '#00f0ff', fontSize: 14, fontWeight: '900' },
  chInfo: { flex: 1 },
  chName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chNum: { color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 },
  selectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00f0ff' },

  // Preview pane
  previewPane: { flex: 1, padding: 40, justifyContent: 'center' },
  preview: { alignItems: 'center', gap: 16 },
  previewLogo: { width: 120, height: 120, borderRadius: 20 },
  previewLogoPlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: '#0d0d1a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,240,255,0.2)',
  },
  previewLogoLetter: { color: '#00f0ff', fontSize: 52, fontWeight: '900' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00f0ff' },
  liveText: { color: '#00f0ff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  previewName: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  previewNum: { color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: 2 },
  playBtn: {
    marginTop: 8,
    backgroundColor: '#00f0ff',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 14,
  },
  playBtnFocused: {
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  playBtnText: { color: '#030308', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  selectHint: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
});
