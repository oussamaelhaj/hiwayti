/**
 * ProviderCard.js — Premium horizontal/vertical card for providers and artisans
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, gradients } from '../../utils/theme';
import { formatDistance, formatRating, formatPrice } from '../../utils/helpers';
import { haptic } from '../../utils/helpers';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.72;
const CARD_W_FULL = width - spacing.lg * 2;

export default function ProviderCard({
  provider,
  onPress,
  horizontal = true,   // true = wide scroll card, false = full-width list card
  showDistance = false,
}) {
  const {
    name, category, commune, rating = 0, reviewCount = 0,
    price, priceUnit = '/session', coverImage, coverUrl, avatarUrl,
    distanceMeters, verified,
  } = provider || {};

  const displayImage = coverUrl || coverImage;

  const cardW = horizontal ? CARD_W : CARD_W_FULL;
  const catColor = colors[category] || colors.gold;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { haptic.light(); onPress?.(); }}
      style={[styles.card, { width: cardW }, !horizontal && styles.cardFull]}
    >
      {/* Cover Image */}
      <View style={[styles.imgWrap, { height: horizontal ? 160 : 140 }]}>
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.img} resizeMode="cover" />
        ) : (
          <LinearGradient colors={gradients.moroccan} style={styles.img} />
        )}
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(6,6,14,0.92)']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Category pill */}
        <View style={[styles.categoryPill, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>{category?.toUpperCase()}</Text>
        </View>
        {/* Verified badge */}
        {verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{name || 'Provider'}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.commune} numberOfLines={1}> {commune || '—'}</Text>
        </View>

        <View style={styles.footer}>
          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text style={styles.rating}> {formatRating(rating)}</Text>
            <Text style={styles.reviewCount}>  ({reviewCount})</Text>
          </View>
          {/* Distance */}
          {showDistance && distanceMeters != null && (
            <Text style={styles.distance}>{formatDistance(distanceMeters)}</Text>
          )}
          {/* Price */}
          {price != null && (
            <Text style={styles.price}>{formatPrice(price)}<Text style={styles.priceUnit}>{priceUnit}</Text></Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  cardFull: { marginRight: 0, marginBottom: spacing.md },
  imgWrap: { position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  categoryPill: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  categoryText: { ...typography.tag },
  verifiedBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    padding: 2,
  },
  content: { padding: spacing.md },
  name: { ...typography.h4, color: colors.textPrimary, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  commune: { ...typography.caption, color: colors.textMuted, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { ...typography.captionBold, color: colors.gold },
  reviewCount: { ...typography.caption, color: colors.textMuted },
  distance: { ...typography.caption, color: colors.accent },
  price: { ...typography.captionBold, color: colors.textPrimary },
  priceUnit: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },
});
