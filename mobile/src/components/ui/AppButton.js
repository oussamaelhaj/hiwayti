/**
 * AppButton.js — Unified Button Component
 * Standardized across the entire application for a premium experience.
 */
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typography, spacing } from '../../utils/theme';
import { haptic } from '../../utils/helpers';

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',  // 'primary' (gold) | 'secondary' (teal) | 'danger' | 'outline' | 'ghost'
  size = 'md',          // 'sm' | 'md' | 'lg'
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
    if (variant === 'danger') haptic.heavy();
    else haptic.medium();
    onPress?.();
  };

  const gradientColors = {
    primary: [colors.goldLight, colors.gold, colors.goldDim],
    secondary: [colors.accent, colors.accentDim],
    danger: [colors.danger, '#C0392B'],
    outline: ['transparent', 'transparent'],
    ghost: ['transparent', 'transparent'],
    marrakech: [colors.terracotta, '#8B4513'],
    atlas: [colors.indigo, colors.bg],
    sahara: [colors.saffron, colors.gold],
  }[variant] || [colors.gold, colors.goldDim];

  const sizeStyle = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, height: 40 },
    md: { paddingVertical: 14, paddingHorizontal: 24, height: 54 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, height: 64 },
  }[size];

  const textFontSize = { sm: 13, md: 15, lg: 17 }[size];

  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isPrimary = variant === 'primary' || variant === 'marrakech' || variant === 'atlas' || variant === 'sahara';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

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
            isOutline && styles.outlineBorder,
            isGhost && styles.ghost,
            (disabled || loading) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={
              (isPrimary || isSecondary || isDanger) ? colors.bg : colors.gold
            } />
          ) : (
            <View style={styles.row}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text style={[
                styles.text,
                { fontSize: textFontSize },
                isOutline && { color: colors.gold },
                isGhost && { color: colors.textSecondary },
                (isPrimary || isSecondary || isDanger) && { color: colors.bg },
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: 8 },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
    backgroundColor: 'rgba(201, 168, 76, 0.05)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
});
