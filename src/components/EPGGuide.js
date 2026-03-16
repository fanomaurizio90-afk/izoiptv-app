import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { epg as epgService } from '../services/epg';

export default function EPGGuide({ streamId, compact = false }) {
  const [epgData, setEpgData] = useState({ current: null, next: null });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!streamId) return;
    loadEPG();
    const interval = setInterval(loadEPG, 60000);
    return () => clearInterval(interval);
  }, [streamId]);

  async function loadEPG() {
    const list = await epgService.getForChannel(streamId);
    const { current, next } = epgService.getCurrentAndNext(list);
    setEpgData({ current, next });
    setProgress(epgService.getProgress(current));
  }

  if (!epgData.current) {
    return (
      <View style={styles.container}>
        <Text style={styles.noProg}>No programme info</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {epgData.current?.title || 'Live'}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        {epgData.next && (
          <Text style={styles.nextCompact} numberOfLines={1}>
            Next: {epgData.next.title}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current */}
      <View style={styles.currentRow}>
        <View style={styles.nowBadge}><Text style={styles.nowText}>NOW</Text></View>
        <View style={styles.progInfo}>
          <Text style={styles.progTitle} numberOfLines={1}>{epgData.current.title}</Text>
          <Text style={styles.progTime}>
            {epgService.parseTime(epgData.current.start_timestamp)} — {epgService.parseTime(epgData.current.stop_timestamp)}
          </Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      {/* Next */}
      {epgData.next && (
        <View style={styles.nextRow}>
          <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>NEXT</Text></View>
          <View style={styles.progInfo}>
            <Text style={styles.progTitleNext} numberOfLines={1}>{epgData.next.title}</Text>
            <Text style={styles.progTime}>
              {epgService.parseTime(epgData.next.start_timestamp)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  compact: {
    gap: 4,
  },
  compactTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nextCompact: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  noProg: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  nowBadge: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowText: {
    color: '#030308',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progInfo: { flex: 1 },
  progTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  progTime: {
    color: 'rgba(0,240,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00f0ff',
    borderRadius: 1,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextBadge: {
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextBadgeText: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progTitleNext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
});
