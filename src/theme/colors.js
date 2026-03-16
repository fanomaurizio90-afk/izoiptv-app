// IZO IPTV Design System — extracted from izoiptv.com
export const Colors = {
  // Backgrounds
  bg: '#030308',
  surface: '#050510',
  surface2: '#0a0a14',
  surface3: '#0d0d1a',
  overlay: 'rgba(3,3,8,0.9)',

  // Accents
  cyan: '#00f0ff',
  cyanDim: '#00c8d4',
  cyanFaint: 'rgba(0,240,255,0.1)',
  cyanBorder: 'rgba(0,240,255,0.2)',
  cyanBorderActive: 'rgba(0,240,255,0.6)',
  cyanGlow: 'rgba(0,240,255,0.3)',

  purple: '#a855f7',
  purpleDark: '#5b21b6',
  purpleFaint: 'rgba(168,85,247,0.1)',
  purpleBorder: 'rgba(168,85,247,0.2)',
  purpleGlow: 'rgba(168,85,247,0.3)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  textFaint: 'rgba(255,255,255,0.2)',
  textLabel: 'rgba(255,255,255,0.3)',

  // Status
  error: '#f87171',
  errorBg: 'rgba(127,29,29,0.2)',
  success: '#4ade80',
  successBg: 'rgba(20,83,45,0.2)',
  warning: '#fb923c',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderCyan: 'rgba(0,240,255,0.2)',
  borderPurple: 'rgba(168,85,247,0.2)',

  // Focus (TV/Fire Stick D-pad)
  focusBg: 'rgba(0,240,255,0.15)',
  focusBorder: '#00f0ff',
  focusShadow: 'rgba(0,240,255,0.5)',
};

export const Gradients = {
  cyanSolid: ['#00c8d4', '#00f0ff'],
  cyanGhost: ['rgba(0,240,255,0.15)', 'rgba(0,240,255,0.05)'],
  purpleSolid: ['#a855f7', '#5b21b6'],
  logo: ['#00f0ff', '#a855f7'],
  shimmer: ['#00f0ff', '#a855f7', '#ffffff', '#a855f7', '#00f0ff'],
  heroOverlay: ['transparent', 'rgba(3,3,8,0.8)', '#030308'],
  cardOverlay: ['transparent', 'rgba(3,3,8,0.95)'],
};

export const Typography = {
  fontFamily: {
    regular: undefined, // system default (Inter-like)
    bold: undefined,
    black: undefined,
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
    hero: 64,
  },
  weight: {
    regular: '400',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 4,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  cyan: {
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  purple: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
