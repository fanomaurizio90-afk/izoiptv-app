import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

// Hexagon IZO logo (SVG-like path drawn with View/border tricks)
function IZOLogo({ size = 80 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ translateY: float }] }]}>
      {/* Glow background */}
      <Animated.View style={[styles.logoGlow, { opacity: pulse, width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 }]} />
      {/* Hex container */}
      <View style={[styles.hexOuter, { width: size, height: size * 1.15 }]}>
        <View style={[styles.hexInner, { width: size * 0.88, height: size * 1.0 }]}>
          <Text style={[styles.izoText, { fontSize: size * 0.38 }]}>IZO</Text>
          <Text style={[styles.iptvText, { fontSize: size * 0.13 }]}>IPTV</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);

  // Ambient animation
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 12000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const orb1Translate = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const orb2Translate = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030308" />

      {/* Ambient orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Translate }] }]} />
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Translate }] }]} />

      {/* Grid lines (decorative) */}
      <View style={styles.grid} pointerEvents="none">
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[styles.gridLine, { left: `${(i + 1) * 12.5}%` }]} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.kbAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <IZOLogo size={90} />

          {/* Title */}
          <Text style={styles.title}>IZO IPTV</Text>
          <Text style={styles.subtitle}>NEXT-GENERATION STREAMING</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SIGN IN TO YOUR ACCOUNT</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <Text style={styles.eyeText}>{showPassword ? '●' : '○'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              hasTVPreferredFocus
            >
              <LinearGradient
                colors={['#00c8d4', '#00f0ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              >
                {loading ? (
                  <LoadingSpinner size={24} color="#030308" />
                ) : (
                  <Text style={styles.submitText}>SIGN IN →</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Contact */}
            <Text style={styles.helpText}>
              Don't have an account?{' '}
              <Text style={styles.helpLink}>Visit izoiptv.com</Text>
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featRow}>
            {['20,000+ Channels', '150K+ VOD', '4K Quality'].map(f => (
              <View key={f} style={styles.feat}>
                <View style={styles.featDot} />
                <Text style={styles.featText}>{f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030308',
  },
  kbAvoid: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    minHeight: height,
  },
  // Ambient
  orb1: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'transparent',
    borderWidth: 0,
    // Glow via shadow
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 80,
    elevation: 0,
    // Use background radial-like
    opacity: 0.5,
  },
  orb2: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 80,
    opacity: 0.5,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,240,255,0.02)',
  },
  // Logo
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,240,255,0.06)',
  },
  hexOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,240,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,240,255,0.4)',
    borderRadius: 12,
    transform: [{ rotate: '0deg' }],
  },
  hexInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 8,
    gap: 2,
  },
  izoText: {
    color: '#00f0ff',
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: '#00f0ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  iptvText: {
    color: 'rgba(0,240,255,0.6)',
    fontWeight: '700',
    letterSpacing: 4,
  },
  // Text
  title: {
    color: '#00f0ff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,240,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    backgroundColor: 'rgba(0,240,255,0.05)',
    marginBottom: 32,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f0ff',
  },
  liveText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Card
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 8,
    gap: 16,
  },
  fieldGroup: { gap: 6 },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputFlex: { flex: 1 },
  eyeBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  eyeText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  errorBox: {
    backgroundColor: 'rgba(127,29,29,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#f87171', fontSize: 13 },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: {
    color: '#030308',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  helpText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
  },
  helpLink: {
    color: '#00f0ff',
    fontWeight: '600',
  },
  // Features row
  featRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  feat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00f0ff',
  },
  featText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
