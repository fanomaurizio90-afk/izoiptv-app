import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  TouchableOpacity, Animated, Platform,
  BackHandler, StatusBar, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { storage } from '../services/storage';
import { usePlayer } from '../context/PlayerContext';
import EPGGuide from '../components/EPGGuide';
import { formatDuration } from '../utils/helpers';
import { getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// VLC player — import with fallback
let VLCPlayer;
try {
  VLCPlayer = require('react-native-vlc-media-player').default;
} catch (e) {
  VLCPlayer = null;
}

function FallbackPlayer({ uri, onError }) {
  return (
    <View style={styles.fallbackPlayer}>
      <Text style={styles.fallbackIcon}>▶</Text>
      <Text style={styles.fallbackText}>VLC Player</Text>
      <Text style={styles.fallbackUrl} numberOfLines={2}>{uri}</Text>
      <Text style={styles.fallbackNote}>Install react-native-vlc-media-player to enable playback</Text>
    </View>
  );
}

export default function PlayerScreen({ navigation, route }) {
  const { stream } = route.params || {};
  const { xtreamConfig } = useAuth();
  const { playStream, stopStream, updatePosition } = usePlayer();

  const [isBuffering, setIsBuffering] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(100);

  const overlayTimer = useRef(null);
  const overlayAnim = useRef(new Animated.Value(1)).current;
  const playerRef = useRef(null);

  // Build stream URL
  const streamUrl = stream?.url || (xtreamConfig ? getXtreamStreamUrl(
    xtreamConfig.server,
    xtreamConfig.username,
    xtreamConfig.password,
    stream?.stream_id || stream?.vod_id,
    stream?.streamType || 'live',
    stream?.streamType === 'live' ? 'ts' : 'mp4'
  ) : null);

  useFocusEffect(
    useCallback(() => {
      if (stream) playStream(stream);
      StatusBar.setHidden(true);
      showOverlayFor(5000);

      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => {
        sub.remove();
        StatusBar.setHidden(false);
        stopStream();
        clearOverlayTimer();
      };
    }, [stream])
  );

  const showOverlayFor = (ms = 4000) => {
    setShowOverlay(true);
    Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    clearOverlayTimer();
    if (stream?.streamType !== 'live') {
      // Auto-hide overlay for VOD
      overlayTimer.current = setTimeout(hideOverlay, ms);
    }
  };

  const hideOverlay = () => {
    Animated.timing(overlayAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setShowOverlay(false);
    });
  };

  const clearOverlayTimer = () => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
  };

  const handleBack = async () => {
    if (stream?.streamType === 'vod' && position > 0) {
      await storage.saveWatchPosition(stream.vod_id, 'vod', position);
    }
    navigation.goBack();
  };

  const handleProgress = (data) => {
    setPosition(data.currentTime);
    setDuration(data.duration);
    updatePosition(data.currentTime);
  };

  const togglePause = () => {
    setIsPaused(p => !p);
    showOverlayFor(3000);
  };

  const handlePress = () => {
    if (showOverlay) {
      if (stream?.streamType !== 'live') togglePause();
      else showOverlayFor(4000);
    } else {
      showOverlayFor(4000);
    }
  };

  const seekBy = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seek(position + seconds);
    }
    showOverlayFor(3000);
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No stream URL available</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video player */}
      <Pressable style={styles.playerArea} onPress={handlePress}>
        {VLCPlayer ? (
          <VLCPlayer
            ref={playerRef}
            style={styles.video}
            source={{ uri: streamUrl }}
            paused={isPaused}
            volume={volume}
            onProgress={handleProgress}
            onBuffering={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={(e) => { setError(e.error || 'Playback error'); setIsBuffering(false); }}
            onLoad={() => setIsBuffering(false)}
            resizeMode="contain"
          />
        ) : (
          <FallbackPlayer uri={streamUrl} />
        )}

        {/* Buffering indicator */}
        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <View style={styles.bufferingSpinner} />
            <Text style={styles.bufferingText}>Buffering...</Text>
          </View>
        )}
      </Pressable>

      {/* Controls overlay */}
      {showOverlay && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.overlayTop}>
            <Pressable onPress={handleBack} style={styles.backBtnOverlay} hasTVPreferredFocus>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle} numberOfLines={1}>
                {stream?.name || stream?.title || 'Playing'}
              </Text>
              {stream?.streamType === 'live' && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            {/* Volume */}
            <Text style={styles.volText}>🔊 {volume}%</Text>
          </View>

          {/* EPG for live */}
          {stream?.streamType === 'live' && stream.stream_id && (
            <View style={styles.epgOverlay}>
              <EPGGuide streamId={stream.stream_id} />
            </View>
          )}

          {/* VOD progress bar */}
          {stream?.streamType !== 'live' && duration > 0 && (
            <View style={styles.progressWrap}>
              <Text style={styles.timeText}>{formatDuration(position)}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.overlayBottom}>
            {stream?.streamType !== 'live' && (
              <>
                <Pressable onPress={() => seekBy(-10)} style={styles.ctrlBtn}>
                  <Text style={styles.ctrlBtnText}>⏮ 10s</Text>
                </Pressable>
                <Pressable onPress={togglePause} style={styles.playPauseBtn}>
                  <Text style={styles.playPauseText}>{isPaused ? '▶' : '⏸'}</Text>
                </Pressable>
                <Pressable onPress={() => seekBy(10)} style={styles.ctrlBtn}>
                  <Text style={styles.ctrlBtnText}>10s ⏭</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => setVolume(v => Math.max(0, v - 10))} style={styles.ctrlBtn}>
              <Text style={styles.ctrlBtnText}>🔉</Text>
            </Pressable>
            <Pressable onPress={() => setVolume(v => Math.min(100, v + 10))} style={styles.ctrlBtn}>
              <Text style={styles.ctrlBtnText}>🔊</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Error overlay */}
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable onPress={() => { setError(null); setIsBuffering(true); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  playerArea: { flex: 1 },
  video: { flex: 1 },
  fallbackPlayer: {
    flex: 1,
    backgroundColor: '#030308',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  fallbackIcon: { fontSize: 64, color: 'rgba(0,240,255,0.4)' },
  fallbackText: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  fallbackUrl: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center' },
  fallbackNote: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 8 },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 12,
  },
  bufferingSpinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderTopColor: '#00f0ff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  bufferingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 36,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    background: 'rgba(0,0,0,0.5)',
    gap: 16,
  },
  backBtnOverlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  streamInfo: { flex: 1 },
  streamTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00f0ff' },
  liveText: { color: '#00f0ff', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  volText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  epgOverlay: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, width: 50 },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00f0ff',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00f0ff',
    marginLeft: -8,
  },
  // Controls
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 16,
  },
  ctrlBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ctrlBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseText: { color: '#030308', fontSize: 24, fontWeight: '900' },
  // Error
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorIcon: { fontSize: 48 },
  errorMsg: { color: '#f87171', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryText: { color: '#030308', fontWeight: '900', letterSpacing: 2 },
  errorText: { color: '#f87171', fontSize: 16, textAlign: 'center', padding: 24 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  backBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
});
