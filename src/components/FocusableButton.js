import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const IS_TV = Platform.isTV;

/**
 * FocusableButton — works with both touch (Android phone/tablet) and
 * D-pad (Fire Stick / Android TV). Shows a bright cyan focus ring when
 * selected via D-pad.
 *
 * Props:
 *   variant: 'solid' | 'ghost' | 'text'
 *   size: 'sm' | 'md' | 'lg'
 *   label: string
 *   onPress: fn
 *   focused: bool (optional, controlled)
 *   style, labelStyle, hasTVPreferredFocus
 */
export default function FocusableButton({
  variant = 'solid',
  size = 'md',
  label,
  children,
  onPress,
  focused: externalFocused,
  style,
  labelStyle,
  hasTVPreferredFocus = false,
  disabled = false,
  ...rest
}) {
  const [internalFocused, setInternalFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isFocused = externalFocused !== undefined ? externalFocused : internalFocused;

  const handleFocus = () => {
    setInternalFocused(true);
    Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true, speed: 20 }).start();
  };

  const handleBlur = () => {
    setInternalFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 12 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 16 },
  }[size];

  const content = (
    <Animated.View
      style={[
        styles.base,
        { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal },
        variant === 'ghost' && styles.ghost,
        variant === 'text' && styles.textVariant,
        isFocused && styles.focused,
        disabled && styles.disabled,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {variant === 'solid' && (
        <LinearGradient
          colors={['#00c8d4', '#00f0ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {children || (
        <Text style={[
          styles.label,
          { fontSize: sizeStyles.fontSize },
          variant === 'solid' && styles.labelSolid,
          variant === 'ghost' && styles.labelGhost,
          variant === 'text' && styles.labelText,
          isFocused && variant !== 'solid' && styles.labelFocused,
          labelStyle,
        ]}>
          {label}
        </Text>
      )}
    </Animated.View>
  );

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  ghost: {
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  textVariant: {
    backgroundColor: 'transparent',
  },
  focused: {
    borderWidth: 2,
    borderColor: '#00f0ff',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
    backgroundColor: 'rgba(0,240,255,0.12)',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelSolid: {
    color: '#030308',
    fontWeight: '900',
  },
  labelGhost: {
    color: '#00f0ff',
  },
  labelText: {
    color: 'rgba(255,255,255,0.6)',
  },
  labelFocused: {
    color: '#00f0ff',
  },
});
