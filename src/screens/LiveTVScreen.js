import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  BackHandler, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { xtream } from '../services/xtream';
import { storage } from '../services/storage';
import { getXtreamStreamUrl } from '../services/xtream';
import ChannelList from '../components/ChannelList';
import LoadingSpinner from '../components/LoadingSpinner';
import EPGGuide from '../components/EPGGuide';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function LiveTVScreen({ navigation }) {
  const { xtreamConfig } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadChannels();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const loadChannels = async () => {
    setLoading(true);
    try {
      const [cats, chans] = await Promise.all([
        xtream.getLiveCategories(),
        xtream.getLiveStreams(),
      ]);
      setCategories(cats);
      setChannels(chans);
      setFilteredChannels(chans);
      if (chans.length) setSelectedChannel(chans[0]);
    } catch (e) {
      console.warn('LiveTV load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    if (!catId) {
      setFilteredChannels(channels);
    } else {
      setFilteredChannels(channels.filter(c => c.category_id === catId));
    }
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  const handlePlay = () => {
    if (!selectedChannel || !xtreamConfig) return;
    const streamUrl = getXtreamStreamUrl(
      xtreamConfig.server,
      xtreamConfig.username,
      xtreamConfig.password,
      selectedChannel.stream_id,
      'live',
      'ts'
    );
    navigation.navigate('Player', {
      stream: {
        ...selectedChannel,
        streamType: 'live',
        url: streamUrl,
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={52} label="Loading channels..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerBack} onPress={() => navigation.goBack()}>← </Text>
        <Text style={styles.headerTitle}>LIVE TV</Text>
        <Text style={styles.headerCount}>{filteredChannels.length} channels</Text>
      </View>

      <View style={styles.body}>
        {/* Channel list sidebar */}
        <View style={styles.listPane}>
          <ChannelList
            channels={filteredChannels}
            categories={categories}
            selectedId={selectedChannel?.stream_id}
            selectedCategory={selectedCategory}
            onChannelSelect={handleChannelSelect}
            onCategorySelect={handleCategorySelect}
          />
        </View>

        {/* Preview pane */}
        <View style={styles.previewPane}>
          {selectedChannel ? (
            <>
              {/* Channel info */}
              <View style={styles.channelPreview}>
                <View style={styles.previewHeader}>
                  <View style={styles.liveTag}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.chNum}>CH {selectedChannel.num}</Text>
                </View>
                <Text style={styles.chName}>{selectedChannel.name}</Text>
                <Text style={styles.chCat}>{selectedChannel.category_name || ''}</Text>

                {/* EPG */}
                <View style={styles.epgWrap}>
                  <EPGGuide streamId={selectedChannel.stream_id} />
                </View>

                {/* Play button */}
                <View style={styles.playActions}>
                  <View
                    accessible
                    style={styles.playBtn}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={handlePlay}
                  >
                    <Text style={styles.playBtnText}>▶  WATCH CHANNEL</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noSelection}>
              <Text style={styles.noSelectionText}>Select a channel</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  loadingContainer: { flex: 1, backgroundColor: '#030308', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,240,255,0.1)',
    backgroundColor: '#050510',
    gap: 12,
  },
  headerBack: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    flex: 1,
  },
  headerCount: { color: 'rgba(0,240,255,0.5)', fontSize: 12 },
  body: { flex: 1, flexDirection: 'row' },
  listPane: { width: 320 },
  previewPane: {
    flex: 1,
    backgroundColor: '#030308',
    padding: 32,
    justifyContent: 'center',
  },
  channelPreview: { gap: 16 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00f0ff' },
  liveText: { color: '#00f0ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  chNum: { color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: 1 },
  chName: { color: '#ffffff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  chCat: { color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  epgWrap: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  playActions: { marginTop: 8 },
  playBtn: {
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  playBtnText: { color: '#030308', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  noSelection: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  noSelectionText: { color: 'rgba(255,255,255,0.2)', fontSize: 16 },
});
