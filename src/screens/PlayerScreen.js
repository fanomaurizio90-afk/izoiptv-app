import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  Animated, Platform, BackHandler, StatusBar, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { storage } from '../services/storage';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/helpers';
import { getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

let VLCPlayer;
try {
  VLCPlayer = require('react-native-vlc-media-player').default;
} catch (e) {
  VLCPlayer = null;
}

// Low-latency VLC options for live IPTV
const LIVE_INIT_OPTIONS = [
  '--network-caching=500',
  '--live-caching=500',
  '--clock-jitter=0',
  '--clock-synchro=0',
  '--http-reconnect',
  '--no-ts-trust-pcr',
  '--rtsp-tcp',
];

const VOD_INIT_OPTIONS = [
  '--network-caching=1500',
  '--http-reconnect',
];

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
  const bufferTimer = useRef(null);
  const overlayAnim = useRef(new Animated.Value(1)).current;
  const playerRef = useRef(null);

  const isLive = stream?.streamType === 'live';

  const streamUrl = stream?.url || (xtreamConfig ? getXtreamStreamUrl(
    xtreamConfig.server,
    xtreamConfig.username,
    xtreamConfig.password,
    stream?.stream_id || stream?.vod_id,
    stream?.streamType || 'live',
    isLive ? 'ts' : 'mp4'
  ) : null);

  useFocusEffect(
    useCallback(() => {
      if (stream) playStream(stream);
      StatusBar.setHidden(true);
      showOverlayFor(5000);
      startBufferTimeout();

      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => {
        sub.remove();
        StatusBar.setHidden(false);
        stopStream();
        clearOverlayTimer();
        clearBufferTimer();
      };
    }, [stream])
  );

  // If buffering lasts more than 15s, show an error with retry option
  const startBufferTimeout = () => {
    clearBufferTimer();
    bufferTimer.current = setTimeout(() => {
      setError('Stream took too long to load. Check your Xtream server URL or try again.');
      setIsBuffering(false);
    }, 15000);
  };

  const clearBufferTimer = () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  };

  const showOverlayFor = (ms = 4000) => {
    setShowOverlay(true);
    Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    clearOverlayTimer();
    if (!isLive) {
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
    if (!isLive && position > 0) {
      await storage.saveWatchPosition(stream.vod_id, 'vod', position);
    }
    navigation.goBack();
  };

  const handleProgress = (data) => {
    setPosition(data.currentTime);
    setDuration(data.duration);
    updatePosition(data.currentTime);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setError(null);
    clearBufferTimer();
  };

  const handleBuffering = (data) => {
    // data.isBuffering = true means still buffering
    if (data?.isBuffering === false) {
      setIsBuffering(false);
      clearBufferTimer();
    } else {
      setIsBuffering(true);
    }
  };

  const handleError = () => {
    clearBufferTimer();
    setError('Playback error — stream may be offline or credentials invalid.');
    setIsBuffering(false);
  };

  const handleRetry = () => {
    setError(null);
    setIsBuffering(true);
    startBufferTimeout();
    // Re-mount player by forcing key change via state
    playerRef.current?.resume(true);
  };

  const togglePause = () => {
    setIsPaused(p => !p);
    showOverlayFor(3000);
  };

  const handlePress = () => {
    if (showOverlay) {
      if (!isLive) togglePause();
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

  const vlcSource = {
    uri: streamUrl,
    initOptions: isLive ? LIVE_INIT_OPTIONS : VOD_INIT_OPTIONS,
  };

  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No stream URL — check Xtream credentials in admin panel.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.playerArea} onPress={handlePress}>
        {VLCPlayer ? (
          <VLCPlayer
            ref={playerRef}
            style={styles.video}
            source={vlcSource}
            paused={isPaused}
            volume={volume}
            autoplay
            autoAspectRatio
            resizeMode="contain"
            onPlaying={handlePlaying}
            onProgress={handleProgress}
            onBuffering={handleBuffering}
            onError={handleError}
            onLoad={handlePlaying}
          />
        ) : (
          <View style={styles.noPlayer}>
            <Text style={styles.noPlayerText}>VLC Player not available</Text>
          </View>
        )}

        {isBuffering && !error && (
          <View style={styles.bufferingOverlay}>
            <View style={styles.spinner} />
            <Text style={styles.bufferingText}>
              {isLive ? 'Loading stream...' : 'Buffering...'}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Controls overlay */}
      {showOverlay && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
          <View style={styles.overlayTop}>
            <Pressable onPress={handleBack} style={styles.backBtnOverlay} hasTVPreferredFocus>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle} numberOfLines={1}>
                {stream?.name || stream?.title || 'Playing'}
              </Text>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => setVolume(v => Math.max(0, v - 10))} style={styles.volBtn}>
              <Text style={styles.volText}>🔉</Text>
            </Pressable>
            <Pressable onPress={() => setVolume(v => Math.min(100, v + 10))} style={styles.volBtn}>
              <Text style={styles.volText}>🔊</Text>
            </Pressable>
          </View>

          {!isLive && duration > 0 && (
            <View style={styles.progressWrap}>
              <Text style={styles.timeText}>{formatDuration(position)}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          )}

          <View style={styles.overlayBottom}>
            {!isLive && (
              <>
                <Pressable onPress={() => seekBy(-10)} style={styles.ctrlBtn}>
                  <Text style={styles.ctrlBtnText}>⏮ 10s</Text>
                </Pressable>
                <Pressable onPress={togglePause} style={styles.playPauseBtn}>
                  <Text style={styles.playPauseText}>{isPaused ? '▶' : '⏸'}</Text>
                </Pressable>
                <Pressable onPress={() => seekBy(30)} style={styles.ctrlBtn}>
                  <Text style={styles.ctrlBtnText}>30s ⏭</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable onPress={handleRetry} style={styles.retryBtn}>
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
  container: { flex: 1, backgroundColor: '#000' },
  playerArea: { flex: 1 },
  video: { flex: 1 },
  noPlayer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPlayerText: { color: '#fff', fontSize: 16 },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 16,
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderTopColor: '#00f0ff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  bufferingText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 36,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 12,
  },
  backBtnOverlay: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  streamInfo: { flex: 1 },
  streamTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00f0ff' },
  liveText: { color: '#00f0ff', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  volBtn: { padding: 8 },
  volText: { fontSize: 20 },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, gap: 12,
  },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, width: 50 },
  progressTrack: {
    flex: 1, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: { height: '100%', backgroundColor: '#00f0ff', borderRadius: 2 },
  overlayBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 24, paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.6)', gap: 16,
  },
  ctrlBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ctrlBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  playPauseBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#00f0ff', alignItems: 'center', justifyContent: 'center',
  },
  playPauseText: { color: '#030308', fontSize: 24, fontWeight: '900' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  errorIcon: { fontSize: 48 },
  errorMsg: { color: '#f87171', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: '#00f0ff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10,
  },
  retryText: { color: '#030308', fontWeight: '900', letterSpacing: 2 },
  errorText: { color: '#f87171', fontSize: 16, textAlign: 'center', padding: 24, marginTop: 80 },
  backBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
  },
  backBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
});
