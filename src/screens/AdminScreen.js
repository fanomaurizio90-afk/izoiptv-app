import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, FlatList, BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { storage } from '../services/storage';
import { xtream } from '../services/xtream';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AdminScreen({ navigation }) {
  const { xtreamConfig, refreshConfig } = useAuth();
  const [activeTab, setActiveTab] = useState('playlists');
  const [logs, setLogs] = useState([]);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);
  const [useTestServer, setUseTestServer] = useState(false);
  const [testServerUrl, setTestServerUrl] = useState('');
  const [epgRefreshing, setEpgRefreshing] = useState(false);
  const [configData, setConfigData] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { navigation.goBack(); return true; });
      return () => sub.remove();
    }, [activeTab])
  );

  const loadData = async () => {
    const l = await storage.getLogs();
    setLogs(l);
    const config = await storage.getXtreamConfig();
    setConfigData(config);
  };

  const handleTestStream = async () => {
    if (!testUrl.trim()) return;
    setTesting(true);
    setTestResult('');
    try {
      const start = Date.now();
      const res = await axios.head(testUrl, { timeout: 8000 });
      const ms = Date.now() - start;
      setTestResult(`✓ OK (${res.status}) — ${ms}ms\nContent-Type: ${res.headers['content-type'] || 'unknown'}`);
    } catch (e) {
      setTestResult(`✗ Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshEPG = async () => {
    setEpgRefreshing(true);
    try {
      await storage.saveEPGCache({});
      await storage.appendLog({ type: 'ADMIN', action: 'EPG_CACHE_CLEARED' });
      setTestResult('EPG cache cleared successfully');
    } catch (e) {
      setTestResult('EPG refresh failed: ' + e.message);
    } finally {
      setEpgRefreshing(false);
    }
  };

  const TABS = [
    { id: 'playlists', label: 'Playlists' },
    { id: 'epg', label: 'EPG' },
    { id: 'stream-test', label: 'Stream Test' },
    { id: 'logs', label: 'Logs' },
    { id: 'server', label: 'Server' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>ADMIN</Text>
        <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>DEV MODE</Text></View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Playlists */}
        {activeTab === 'playlists' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Xtream Config</Text>
            {configData ? (
              <View style={styles.configCard}>
                <ConfigRow label="Server" value={configData.server} />
                <ConfigRow label="Username" value={configData.username} />
                <ConfigRow label="Password" value={'•'.repeat(configData.password?.length || 8)} />
              </View>
            ) : (
              <Text style={styles.noData}>No playlist configured</Text>
            )}
            <Pressable onPress={refreshConfig} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>↻  FORCE REFRESH FROM SERVER</Text>
            </Pressable>
          </View>
        )}

        {/* EPG */}
        {activeTab === 'epg' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EPG Management</Text>
            <Text style={styles.infoText}>Clear EPG cache to force re-fetch from Xtream server.</Text>
            <Pressable onPress={handleRefreshEPG} style={[styles.actionBtn, epgRefreshing && styles.actionBtnDisabled]}>
              <Text style={styles.actionBtnText}>{epgRefreshing ? 'Clearing...' : '↻  CLEAR EPG CACHE'}</Text>
            </Pressable>
            {testResult ? <Text style={styles.result}>{testResult}</Text> : null}
          </View>
        )}

        {/* Stream Test */}
        {activeTab === 'stream-test' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Stream URL</Text>
            <TextInput
              style={styles.input}
              value={testUrl}
              onChangeText={setTestUrl}
              placeholder="http://server:port/live/user/pass/123.ts"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={handleTestStream} style={[styles.actionBtn, testing && styles.actionBtnDisabled]}>
              <Text style={styles.actionBtnText}>{testing ? 'Testing...' : '▶  TEST STREAM'}</Text>
            </Pressable>
            {testResult ? (
              <View style={[styles.resultBox, testResult.startsWith('✓') ? styles.resultOk : styles.resultErr]}>
                <Text style={styles.resultText}>{testResult}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <View style={styles.section}>
            <View style={styles.logsHeader}>
              <Text style={styles.sectionTitle}>App Logs ({logs.length})</Text>
              <Pressable onPress={async () => { await storage.clearLogs(); setLogs([]); }} style={styles.clearLogsBtn}>
                <Text style={styles.clearLogsBtnText}>CLEAR</Text>
              </Pressable>
            </View>
            {logs.length === 0 ? (
              <Text style={styles.noData}>No logs</Text>
            ) : (
              logs.map((log, i) => (
                <View key={i} style={styles.logRow}>
                  <Text style={[styles.logType, log.type?.includes('ERROR') ? styles.logTypeError : styles.logTypeInfo]}>
                    {log.type}
                  </Text>
                  <Text style={styles.logTime}>{new Date(log.time).toLocaleTimeString()}</Text>
                  <Text style={styles.logMsg} numberOfLines={1}>
                    {log.url || log.message || log.action || ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Server toggle */}
        {activeTab === 'server' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server Environment</Text>
            <View style={styles.envRow}>
              <Text style={styles.envLabel}>Current Environment</Text>
              <View style={[styles.envBadge, !useTestServer ? styles.envBadgeProd : styles.envBadgeTest]}>
                <Text style={styles.envBadgeText}>{useTestServer ? 'TEST' : 'PRODUCTION'}</Text>
              </View>
            </View>
            <Text style={styles.infoText}>Website API: https://www.izoiptv.com</Text>
            <Text style={styles.infoText}>Xtream: {configData?.server || 'Not configured'}</Text>

            {useTestServer && (
              <TextInput
                style={styles.input}
                value={testServerUrl}
                onChangeText={setTestServerUrl}
                placeholder="Test server URL"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
              />
            )}
            <Pressable onPress={() => setUseTestServer(v => !v)} style={[styles.actionBtn, useTestServer ? styles.actionBtnActive : {}]}>
              <Text style={styles.actionBtnText}>{useTestServer ? '✓ DISABLE TEST MODE' : '⚡ ENABLE TEST MODE'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ConfigRow({ label, value }) {
  return (
    <View style={crStyles.row}>
      <Text style={crStyles.label}>{label}</Text>
      <Text style={crStyles.value} numberOfLines={1} selectable>{value}</Text>
    </View>
  );
}

const crStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 12, width: 80 },
  value: { color: '#00f0ff', fontSize: 12, flex: 1, fontFamily: 'monospace' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.2)', backgroundColor: '#050510', gap: 12,
  },
  backBtn: { marginRight: 4 },
  backText: { color: '#a855f7', fontSize: 22, fontWeight: '900' },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 3, flex: 1 },
  adminBadge: {
    backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  adminBadgeText: { color: '#a855f7', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  tabBar: { borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.1)', backgroundColor: '#050510' },
  tabBarContent: { paddingHorizontal: 16, gap: 4, paddingVertical: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabActive: { borderColor: 'rgba(168,85,247,0.4)', backgroundColor: 'rgba(168,85,247,0.08)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#a855f7', fontWeight: '700' },
  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 16, paddingBottom: 60 },
  section: { gap: 12 },
  sectionTitle: { color: '#a855f7', fontSize: 11, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase' },
  configCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.15)', borderRadius: 12, padding: 16,
  },
  noData: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  actionBtn: {
    backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  actionBtnActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#a855f7' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#a855f7', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: '#ffffff', fontSize: 13,
  },
  resultBox: { borderRadius: 10, padding: 12, borderWidth: 1 },
  resultOk: { backgroundColor: 'rgba(20,83,45,0.2)', borderColor: 'rgba(74,222,128,0.3)' },
  resultErr: { backgroundColor: 'rgba(127,29,29,0.2)', borderColor: 'rgba(248,113,113,0.3)' },
  resultText: { color: '#ffffff', fontSize: 12, fontFamily: 'monospace' },
  result: { color: '#4ade80', fontSize: 13, marginTop: 4 },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  logsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearLogsBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  clearLogsBtnText: { color: '#f87171', fontSize: 11, fontWeight: '700' },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  logType: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, width: 80 },
  logTypeInfo: { color: '#00f0ff' },
  logTypeError: { color: '#f87171' },
  logTime: { color: 'rgba(255,255,255,0.2)', fontSize: 10, width: 60 },
  logMsg: { color: 'rgba(255,255,255,0.4)', fontSize: 11, flex: 1 },
  envRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  envLabel: { color: '#ffffff', fontSize: 14 },
  envBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  envBadgeProd: { borderColor: 'rgba(74,222,128,0.4)', backgroundColor: 'rgba(20,83,45,0.2)' },
  envBadgeTest: { borderColor: 'rgba(251,146,60,0.4)', backgroundColor: 'rgba(120,53,15,0.2)' },
  envBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
});
