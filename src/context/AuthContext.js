import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { initXtream } from '../services/xtream';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [xtreamConfig, setXtreamConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Try to restore session on app launch
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const token = await storage.getToken();
      if (!token) { setIsLoading(false); return; }

      // Fetch fresh config from server
      const config = await api.getConfig();
      const savedUser = await storage.getUser();

      const xtream = {
        server: config.xtreamServer,
        username: config.xtreamUsername,
        password: config.xtreamPassword,
      };

      initXtream(xtream.server, xtream.username, xtream.password);
      await storage.saveXtreamConfig(xtream);

      setUser(savedUser);
      setXtreamConfig(xtream);
      setIsAuthenticated(true);
    } catch (e) {
      // Token expired or server error — fall through to login
      await storage.removeToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);

    await storage.saveToken(data.token);
    await storage.saveUser({ username: data.username, subscriptionExpiry: data.subscriptionExpiry });

    const xtream = {
      server: data.xtreamServer,
      username: data.xtreamUsername,
      password: data.xtreamPassword,
    };
    await storage.saveXtreamConfig(xtream);
    initXtream(xtream.server, xtream.username, xtream.password);

    setUser({ username: data.username, subscriptionExpiry: data.subscriptionExpiry });
    setXtreamConfig(xtream);
    setIsAuthenticated(true);

    return data;
  }, []);

  const logout = useCallback(async () => {
    await storage.removeToken();
    await storage.clearAll();
    setUser(null);
    setXtreamConfig(null);
    setIsAuthenticated(false);
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const config = await api.refreshConfig();
      const xtream = {
        server: config.xtreamServer,
        username: config.xtreamUsername,
        password: config.xtreamPassword,
      };
      await storage.saveXtreamConfig(xtream);
      initXtream(xtream.server, xtream.username, xtream.password);
      setXtreamConfig(xtream);
    } catch (e) {
      console.warn('Config refresh failed:', e.message);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, xtreamConfig, isLoading, isAuthenticated, login, logout, refreshConfig }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
