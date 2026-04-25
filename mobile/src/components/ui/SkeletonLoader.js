/**
 * SkeletonLoader.js — Animated skeleton placeholders for loading states
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing } from '../../utils/theme';

function Bone({ width, height, style, borderRadius = radius.sm }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.bgElevated, opacity: anim },
        style,
      ]}
    />
  );
}

export function ProviderCardSkeleton() {
  return (
    <View style={styles.card}>
      <Bone width="100%" height={160} borderRadius={0} />
      <View style={{ padding: spacing.md, gap: 8 }}>
        <Bone width="70%" height={16} />
        <Bone width="45%" height={12} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Bone width="30%" height={12} />
          <Bone width="25%" height={12} />
        </View>
      </View>
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Bone width={52} height={52} borderRadius={radius.md} />
      <View style={{ flex: 1, marginLeft: spacing.md, gap: 8 }}>
        <Bone width="60%" height={15} />
        <Bone width="40%" height={11} />
      </View>
      <Bone width={50} height={20} borderRadius={radius.full} />
    </View>
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard}>
      <Bone width="100%" height={140} borderRadius={0} />
      <View style={{ padding: spacing.sm, gap: 6 }}>
        <Bone width="75%" height={14} />
        <Bone width="40%" height={11} />
        <Bone width="35%" height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View style={{ gap: spacing.sm, padding: spacing.lg }}>
      <Bone width={120} height={13} />
      <Bone width="75%" height={32} />
      <Bone width="50%" height={13} style={{ marginTop: 4 }} />
    </View>
  );
}

export default Bone;

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  productCard: {
    width: 160,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
