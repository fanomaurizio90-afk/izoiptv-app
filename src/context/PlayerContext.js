import React, { createContext, useContext, useState, useCallback } from 'react';
import { storage } from '../services/storage';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentStream, setCurrentStream] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  const playStream = useCallback(async (stream) => {
    // Save to recently watched
    await storage.addRecentlyWatched({
      id: stream.stream_id || stream.vod_id || stream.series_id,
      type: stream.streamType,
      title: stream.name || stream.title,
      poster: stream.stream_icon || stream.cover,
    });
    setCurrentStream(stream);
    setIsPlaying(true);
  }, []);

  const stopStream = useCallback(async () => {
    if (currentStream) {
      // Save watch position if VOD
      if (currentStream.streamType === 'vod' && currentStream._position) {
        await storage.saveWatchPosition(
          currentStream.vod_id,
          'vod',
          currentStream._position
        );
      }
    }
    setCurrentStream(null);
    setIsPlaying(false);
  }, [currentStream]);

  const updatePosition = useCallback((position) => {
    if (currentStream) {
      setCurrentStream(prev => prev ? { ...prev, _position: position } : null);
    }
  }, [currentStream]);

  return (
    <PlayerContext.Provider value={{
      currentStream, isPlaying, isBuffering, volume, isMuted,
      setIsBuffering, setVolume, setIsMuted,
      playStream, stopStream, updatePosition,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
