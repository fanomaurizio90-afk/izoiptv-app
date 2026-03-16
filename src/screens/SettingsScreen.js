import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Switch, Alert, BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { formatExpiry, daysUntil } from '../utils/helpers';

const ADMIN_TAP_TARGET = 5; // tap version number 5 times to enter admin

export default function SettingsScreen({ navigation }) {
  const { user, xtreamConfig, logout } = useAuth();
  const [settings, setSettings] = useState({ autoplay: true, defaultQuality: 'auto', parentalPin: null });
  const [serverUrl, setServerUrl] = useState(xtreamConfig?.server || '');
  const [editingServer, setEditingServer] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);
  const tapTimer = useRef(null);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { navigation.goBack(); return true; });
      return () => sub.remove();
    }, [])
  );

  const loadSettings = async () => {
    const s = await storage.getSettings();
    setSettings(s);
    const config = await storage.getXtreamConfig();
    if (config) setServerUrl(config.server);
  };

  const saveSettings = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await storage.saveSettings(merged);
  };

  const handleVersionTap = () => {
    setVersionTaps(t => {
      const next = t + 1;
      if (next >= ADMIN_TAP_TARGET) {
        setVersionTaps(0);
        navigation.navigate('Admin');
      } else {
        clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => setVersionTaps(0), 2000);
      }
      return next;
    });
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await storage.clearLogs();
      await storage.saveEPGCache?.({});
    } catch (e) {}
    setClearing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const expiryDays = daysUntil(user?.subscriptionExpiry);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Account */}
        <Section title="ACCOUNT" accent="#00f0ff">
          <InfoRow label="Username" value={user?.username || '—'} valueColor="#00f0ff" />
          <InfoRow
            label="Subscription"
            value={`${expiryDays} days remaining`}
            valueColor={expiryDays <= 7 ? '#fb923c' : '#4ade80'}
          />
          <InfoRow label="Expires" value={formatExpiry(user?.subscriptionExpiry)} />
          <InfoRow
            label="Xtream Server"
            value={serverUrl || 'Not configured'}
            valueColor="rgba(255,255,255,0.4)"
          />
        </Section>

        {/* Playback */}
        <Section title="PLAYBACK" accent="#a855f7">
          <ToggleRow
            label="Autoplay"
            desc="Automatically play next episode"
            value={settings.autoplay}
            onChange={(v) => saveSettings({ autoplay: v })}
          />
          <SelectRow
            label="Default Quality"
            options={['auto', '1080p', '720p', '480p']}
            value={settings.defaultQuality}
            onChange={(v) => saveSettings({ defaultQuality: v })}
          />
        </Section>

        {/* Server config */}
        <Section title="SERVER" accent="#00f0ff">
          {editingServer ? (
            <View style={styles.editServerWrap}>
              <TextInput
                style={styles.serverInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://server:port"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.editServerBtns}>
                <Pressable
                  onPress={async () => {
                    const config = await storage.getXtreamConfig();
                    if (config) {
                      await storage.saveXtreamConfig({ ...config, server: serverUrl });
                    }
                    setEditingServer(false);
                  }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>SAVE</Text>
                </Pressable>
                <Pressable onPress={() => setEditingServer(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <ActionRow
              label="Server URL"
              value={serverUrl || 'Not set'}
              onPress={() => setEditingServer(true)}
              action="Edit"
            />
          )}
        </Section>

        {/* Parental */}
        <Section title="PARENTAL CONTROLS" accent="#a855f7">
          <ActionRow
            label="PIN Protection"
            value={settings.parentalPin ? 'Enabled' : 'Disabled'}
            onPress={() => {}}
            action={settings.parentalPin ? 'Change' : 'Set PIN'}
          />
        </Section>

        {/* Maintenance */}
        <Section title="MAINTENANCE" accent="#00f0ff">
          <ActionRow
            label="Clear Cache"
            value="EPG data, logs, thumbnails"
            onPress={handleClearCache}
            action={clearing ? 'Clearing...' : 'Clear'}
            actionColor="#fb923c"
          />
        </Section>

        {/* Sign out */}
        <Section title="SESSION" accent="#f87171">
          <Pressable onPress={handleLogout} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
        </Section>

        {/* App info (tap to unlock admin) */}
        <Pressable onPress={handleVersionTap} style={styles.appInfo}>
          <Text style={styles.appName}>IZO IPTV</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          {versionTaps > 0 && versionTaps < ADMIN_TAP_TARGET && (
            <Text style={styles.tapHint}>{ADMIN_TAP_TARGET - versionTaps} more taps for admin</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// Sub-components
function Section({ title, children, accent }) {
  return (
    <View style={sStyles.section}>
      <Text style={[sStyles.sectionTitle, { color: accent }]}>{title}</Text>
      <View style={sStyles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={sStyles.row}>
      <Text style={sStyles.rowLabel}>{label}</Text>
      <Text style={[sStyles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <View style={sStyles.row}>
      <View style={sStyles.rowLeft}>
        <Text style={sStyles.rowLabel}>{label}</Text>
        {desc && <Text style={sStyles.rowDesc}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,240,255,0.4)' }}
        thumbColor={value ? '#00f0ff' : 'rgba(255,255,255,0.5)'}
      />
    </View>
  );
}

function SelectRow({ label, options, value, onChange }) {
  return (
    <View style={sStyles.row}>
      <Text style={sStyles.rowLabel}>{label}</Text>
      <View style={sStyles.selectRow}>
        {options.map(opt => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[sStyles.selectOpt, value === opt && sStyles.selectOptActive]}
          >
            <Text style={[sStyles.selectOptText, value === opt && sStyles.selectOptTextActive]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ActionRow({ label, value, onPress, action, actionColor = '#00f0ff' }) {
  return (
    <View style={sStyles.row}>
      <View style={sStyles.rowLeft}>
        <Text style={sStyles.rowLabel}>{label}</Text>
        {value && <Text style={sStyles.rowDesc}>{value}</Text>}
      </View>
      <Pressable onPress={onPress} style={sStyles.actionBtn}>
        <Text style={[sStyles.actionBtnText, { color: actionColor }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

const sStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 10, fontWeight: '900', letterSpacing: 3,
    textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.1)',
    borderRadius: 14, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  rowDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  rowValue: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  selectRow: { flexDirection: 'row', gap: 6 },
  selectOpt: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  selectOptActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0,240,255,0.1)' },
  selectOptText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  selectOptTextActive: { color: '#00f0ff', fontWeight: '700' },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030308' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,240,255,0.08)', backgroundColor: '#050510', gap: 12,
  },
  backBtn: { marginRight: 4 },
  backText: { color: '#00f0ff', fontSize: 22, fontWeight: '900' },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  editServerWrap: { padding: 16, gap: 12 },
  serverInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: '#ffffff', fontSize: 14,
  },
  editServerBtns: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: '#00f0ff', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  saveBtnText: { color: '#030308', fontWeight: '900', fontSize: 13 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 },
  signOutBtn: {
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(127,29,29,0.1)',
    margin: 4,
  },
  signOutText: { color: '#f87171', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  appInfo: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  appName: { color: 'rgba(0,240,255,0.3)', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  appVersion: { color: 'rgba(255,255,255,0.15)', fontSize: 12 },
  tapHint: { color: 'rgba(168,85,247,0.5)', fontSize: 11, marginTop: 4 },
});
