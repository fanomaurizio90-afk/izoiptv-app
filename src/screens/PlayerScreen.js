import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated,
  BackHandler, StatusBar, Pressable,
} from 'react-native';
import Video from 'react-native-video';
import { useFocusEffect } from '@react-navigation/native';
import { storage } from '../services/storage';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/helpers';
import { getXtreamStreamUrl } from '../services/xtream';
import { useAuth } from '../context/AuthContext';

export default function PlayerScreen({ navigation, route }) {
  const { stream, channels: passedChannels, channelIndex: passedIndex } = route.params || {};
  const { xtreamConfig } = useAuth();
  const { playStream, stopStream, updatePosition } = usePlayer();

  // Channel list for prev/next (live TV only)
  const channels = passedChannels || [];
  const [channelIdx, setChannelIdx] = useState(passedIndex ?? -1);
  const [activeStream, setActiveStream] = useState(stream);

  const [isBuffering, setIsBuffering] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(() => buildStreamUrl(stream, xtreamConfig));

  const overlayTimer = useRef(null);
  const bufferTimer = useRef(null);
  const overlayAnim = useRef(new Animated.Value(1)).current;
  const playerRef = useRef(null);

  const isLive = activeStream?.streamType === 'live';
  const hasPrev = channelIdx > 0;
  const hasNext = channelIdx >= 0 && channelIdx < channels.length - 1;

  useFocusEffect(
    useCallback(() => {
      if (activeStream) playStream(activeStream);
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
    }, [])
  );

  // ─── Channel switching ──────────────────────────────────────────────────────
  const switchChannel = (idx) => {
    if (idx < 0 || idx >= channels.length) return;
    const ch = channels[idx];
    const url = buildStreamUrl({ ...ch, streamType: 'live' }, xtreamConfig);
    setChannelIdx(idx);
    setActiveStream({ ...ch, streamType: 'live', url });
    setStreamUrl(url);
    setError(null);
    setIsBuffering(true);
    setPosition(0);
    setDuration(0);
    playStream(ch);
    startBufferTimeout();
    showOverlayFor(5000);
  };

  // ─── Buffer timeout ─────────────────────────────────────────────────────────
  const startBufferTimeout = () => {
    clearBufferTimer();
    bufferTimer.current = setTimeout(() => {
      setError('Stream is taking too long to load. Check your connection or try another channel.');
      setIsBuffering(false);
    }, 20000);
  };
  const clearBufferTimer = () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  };

  // ─── Overlay auto-hide (BOTH live TV and VOD) ───────────────────────────────
  const showOverlayFor = (ms = 4000) => {
    setShowOverlay(true);
    Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    clearOverlayTimer();
    overlayTimer.current = setTimeout(hideOverlay, ms);
  };
  const hideOverlay = () => {
    Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setShowOverlay(false);
    });
  };
  const clearOverlayTimer = () => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
  };

  // ─── Event handlers ─────────────────────────────────────────────────────────
  const handleBack = async () => {
    if (!isLive && position > 0) {
      await storage.saveWatchPosition(activeStream?.vod_id, 'vod', position);
    }
    navigation.goBack();
  };

  const handleLoad = (data) => {
    clearBufferTimer();
    setIsBuffering(false);
    setError(null);
    if (data?.duration) setDuration(data.duration);
  };

  const handleProgress = (data) => {
    setPosition(data.currentTime);
    updatePosition(data.currentTime);
  };

  const handleBuffer = ({ isBuffering: buffering }) => {
    setIsBuffering(buffering);
    if (!buffering) { clearBufferTimer(); setError(null); }
  };

  const handleError = (e) => {
    clearBufferTimer();
    setIsBuffering(false);
    setError('Playback error — stream may be offline or credentials are invalid.');
    console.warn('Player error:', e);
  };

  const handlePress = () => {
    showOverlayFor(isLive ? 5000 : 4000);
    if (showOverlay && !isLive) setIsPaused(p => !p);
  };

  const seekBy = (seconds) => {
    if (playerRef.current) playerRef.current.seek(position + seconds);
    showOverlayFor(3000);
  };

  const handleRetry = () => {
    setError(null);
    setIsBuffering(true);
    setIsPaused(false);
    startBufferTimeout();
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.msgText}>No stream URL — check Xtream credentials in admin panel.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen player — tap to toggle overlay */}
      <Pressable style={styles.playerArea} onPress={handlePress}>
        <Video
          ref={playerRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode="contain"
          paused={isPaused}
          bufferConfig={{
            minBufferMs: isLive ? 500 : 2500,
            maxBufferMs: isLive ? 2000 : 10000,
            bufferForPlaybackMs: isLive ? 500 : 1000,
            bufferForPlaybackAfterRebufferMs: isLive ? 500 : 2000,
          }}
          maxBitRate={0}
          useTextureView
          hideShutterView
          progressUpdateInterval={500}
          reportBandwidth
          onLoad={handleLoad}
          onProgress={handleProgress}
          onBuffer={handleBuffer}
          onError={handleError}
          playInBackground={false}
          playWhenInactive={false}
        />
        {isBuffering && !error && (
          <View style={styles.bufferingOverlay}>
            <View style={styles.spinner} />
            <Text style={styles.bufferingText}>
              {isLive ? 'Loading stream...' : 'Buffering...'}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Overlay — fades in/out, auto-hides after timeout */}
      {showOverlay && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.overlayTop}>
            <Pressable onPress={handleBack} style={styles.backBtnOverlay} hasTVPreferredFocus>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle} numberOfLines={1}>
                {activeStream?.name || activeStream?.title || 'Playing'}
              </Text>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          </View>

          {/* VOD progress bar */}
          {!isLive && duration > 0 && (
            <View style={styles.progressWrap}>
              <Text style={styles.timeText}>{formatDuration(position)}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.overlayBottom}>
            {isLive ? (
              /* Live TV: prev channel · channel counter · next channel */
              <>
                <Pressable
                  onPress={() => switchChannel(channelIdx - 1)}
                  style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
                  disabled={!hasPrev}
                >
                  <Text style={styles.navBtnText}>⏮</Text>
                  <Text style={styles.navBtnLabel}>PREV</Text>
                </Pressable>
                <View style={styles.liveInfo}>
                  {channelIdx >= 0 && (
                    <Text style={styles.channelCounter}>
                      {channelIdx + 1} / {channels.length}
                    </Text>
                  )}
                  <Text style={styles.tapHint}>Tap screen to show/hide</Text>
                </View>
                <Pressable
                  onPress={() => switchChannel(channelIdx + 1)}
                  style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
                  disabled={!hasNext}
                >
                  <Text style={styles.navBtnText}>⏭</Text>
                  <Text style={styles.navBtnLabel}>NEXT</Text>
                </Pressable>
              </>
            ) : (
              /* VOD: seek back · play/pause · seek forward */
              <>
                <Pressable onPress={() => seekBy(-10)} style={styles.ctrlBtn}>
                  <Text style={styles.ctrlBtnText}>⏮ 10s</Text>
                </Pressable>
                <Pressable onPress={() => setIsPaused(p => !p)} style={styles.playPauseBtn}>
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

      {/* Error overlay */}
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

// Helper — build stream URL from stream object + xtream config
function buildStreamUrl(s, cfg) {
  if (s?.url) return s.url;
  if (!cfg || !s) return null;
  return getXtreamStreamUrl(
    cfg.server, cfg.username, cfg.password,
    s.stream_id || s.vod_id,
    s.streamType || 'live',
    s.streamType === 'live' ? 'ts' : 'mp4'
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  playerArea: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },

  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', gap: 16,
  },
  spinner: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3,
    borderTopColor: '#00f0ff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  bufferingText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  overlayTop: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 36,
    backgroundColor: 'rgba(0,0,0,0.75)', gap: 12,
  },
  backBtnOverlay: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  streamInfo: { flex: 1 },
  streamTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, gap: 12,
  },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, width: 52 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#00f0ff', borderRadius: 2 },

  overlayBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 24, paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.75)', gap: 20,
  },

  // Live TV prev/next buttons
  navBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, backgroundColor: 'rgba(0,240,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)',
    gap: 2,
  },
  navBtnDisabled: { opacity: 0.25, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  navBtnText: { color: '#00f0ff', fontSize: 20 },
  navBtnLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  liveInfo: { flex: 1, alignItems: 'center', gap: 4 },
  channelCounter: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },
  tapHint: { color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: 1 },

  // VOD controls
  ctrlBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  ctrlBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  playPauseBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#00f0ff', alignItems: 'center', justifyContent: 'center',
  },
  playPauseText: { color: '#030308', fontSize: 24, fontWeight: '900' },

  // Error
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
  msgText: { color: '#f87171', fontSize: 16, textAlign: 'center', padding: 24, marginTop: 80 },
  backBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
  },
  backBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
});
