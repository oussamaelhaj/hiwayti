/**
 * GlassCard.js — Glassmorphism card component
 * HIWAYTI premium UI building block
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, shadow } from '../../utils/theme';

export default function GlassCard({
  children,
  style,
  onPress,
  intensity = 20,
  goldBorder = false,
  elevated = false,
  noBlur = false,
}) {
  const containerStyle = [
    styles.card,
    goldBorder && styles.goldBorder,
    elevated && styles.elevated,
    style,
  ];

  const content = noBlur ? (
    <View style={[styles.inner, containerStyle]}>{children}</View>
  ) : (
    <BlurView tint="dark" intensity={intensity} style={[styles.blur, containerStyle]}>
      {children}
    </BlurView>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(14,14,28,0.75)',
    ...shadow.card,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: 'rgba(14,14,28,0.88)',
  },
  goldBorder: {
    borderColor: colors.goldBorder,
    ...shadow.gold,
  },
  elevated: {
    backgroundColor: 'rgba(22,22,40,0.85)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
