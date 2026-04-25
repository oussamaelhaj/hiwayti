/**
 * GoldButton.js — Primary CTA button with Moroccan gold gradient
 */
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typography } from '../../utils/theme';
import { haptic } from '../../utils/helpers';

export default function GoldButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'gold',      // 'gold' | 'teal' | 'outline' | 'ghost'
  size = 'md',           // 'sm' | 'md' | 'lg'
  icon = null,
  style,
  textStyle,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };
  const handlePress = () => {
    haptic.medium();
    onPress?.();
  };

  const gradientColors = {
    gold:  [colors.goldLight, colors.gold, colors.goldDim],
    teal:  [colors.accent, colors.accentDim],
    outline: ['transparent', 'transparent'],
    ghost: ['transparent', 'transparent'],
  }[variant] || [colors.gold, colors.goldDim];

  const sizeStyle = {
    sm: { paddingVertical: 10, paddingHorizontal: 20 },
    md: { paddingVertical: 16, paddingHorizontal: 28 },
    lg: { paddingVertical: 20, paddingHorizontal: 36 },
  }[size];

  const textSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            sizeStyle,
            variant === 'outline' && styles.outlineBorder,
            variant === 'ghost' && styles.ghost,
            (disabled || loading) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={
              variant === 'gold' ? colors.bg : colors.gold
            } />
          ) : (
            <View style={styles.row}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text style={[
                styles.text,
                { fontSize: textSize },
                variant === 'outline' && { color: colors.gold },
                variant === 'ghost'   && { color: colors.textSecondary },
                variant === 'teal'    && { color: colors.bg },
                textStyle,
              ]}>
                {title}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: 8 },
  text: {
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: 0.4,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
});
