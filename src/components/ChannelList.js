import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, Pressable,
  StyleSheet, Image, Animated,
} from 'react-native';
import EPGGuide from './EPGGuide';

function ChannelItem({ item, isSelected, onPress, index }) {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, speed: 30 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Pressable onPress={onPress} onFocus={onFocus} onBlur={onBlur}>
      <Animated.View
        style={[
          styles.channelItem,
          isSelected && styles.channelItemSelected,
          focused && styles.channelItemFocused,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.chNum}>{item.num}</Text>
        {item.stream_icon ? (
          <Image source={{ uri: item.stream_icon }} style={styles.chLogo} resizeMode="contain" />
        ) : (
          <View style={styles.chLogoPlaceholder}>
            <Text style={styles.chLogoText}>{(item.name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.chInfo}>
          <Text style={styles.chName} numberOfLines={1}>{item.name}</Text>
          <EPGGuide streamId={item.stream_id} compact />
        </View>
        {(isSelected || focused) && <View style={styles.playingDot} />}
      </Animated.View>
    </Pressable>
  );
}

export default function ChannelList({
  channels = [],
  categories = [],
  selectedId,
  selectedCategory,
  onChannelSelect,
  onCategorySelect,
}) {
  const listRef = useRef(null);

  return (
    <View style={styles.container}>
      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.catRow}>
          <FlatList
            horizontal
            data={[{ category_id: null, category_name: 'All' }, ...categories]}
            keyExtractor={item => String(item.category_id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onCategorySelect?.(item.category_id)}
                style={[
                  styles.catChip,
                  selectedCategory === item.category_id && styles.catChipActive,
                ]}
              >
                <Text style={[
                  styles.catText,
                  selectedCategory === item.category_id && styles.catTextActive,
                ]}>
                  {item.category_name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Channel list */}
      <FlatList
        ref={listRef}
        data={channels}
        keyExtractor={item => String(item.stream_id)}
        renderItem={({ item, index }) => (
          <ChannelItem
            item={item}
            isSelected={item.stream_id === selectedId}
            onPress={() => onChannelSelect?.(item)}
            index={index}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({ length: 72, offset: 72 * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,240,255,0.1)',
  },
  catRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  catList: {
    padding: 8,
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  catChipActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0,240,255,0.1)',
  },
  catText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  catTextActive: {
    color: '#00f0ff',
  },
  listContent: { paddingBottom: 20 },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    gap: 10,
  },
  channelItemSelected: {
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#00f0ff',
  },
  channelItemFocused: {
    backgroundColor: 'rgba(0,240,255,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#00f0ff',
  },
  chNum: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    width: 24,
    textAlign: 'right',
  },
  chLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#0d0d1a',
  },
  chLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.1)',
  },
  chLogoText: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '900',
  },
  chInfo: { flex: 1 },
  chName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00f0ff',
  },
});
