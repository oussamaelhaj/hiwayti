/**
 * ProductCard.js — Shop product card for artisanat marketplace
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, gradients } from '../../utils/theme';
import { formatPrice, formatRating, haptic } from '../../utils/helpers';

const CARD_W = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2;

export default function ProductCard({ product, onPress, onFavorite, isFavorite = false }) {
  const {
    name, artisanName, category, price, rating = 0, reviewCount = 0,
    imageUrl, verified,
  } = product || {};

  const catColor = colors[category] || colors.gold;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => { haptic.light(); onPress?.(); }}
    >
      {/* Image */}
      <View style={styles.imgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[colors.bgElevated, colors.bg]} style={styles.img}>
            <Ionicons name="basket-outline" size={32} color={colors.textMuted} />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(6,6,14,0.7)']} style={StyleSheet.absoluteFillObject} />

        {/* Favorite */}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => { haptic.select(); onFavorite?.(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? colors.danger : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Verified artisan badge */}
        {verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.gold} />
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{name || 'Produit'}</Text>
        <Text style={styles.artisan} numberOfLines={1}>{artisanName || ''}</Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color={colors.gold} />
          <Text style={styles.rating}> {formatRating(rating)}</Text>
          <Text style={styles.reviewCount}>  ({reviewCount})</Text>
        </View>

        <Text style={styles.price}>{formatPrice(price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  imgWrap: {
    height: 150,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  favBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(6,6,14,0.65)',
    borderRadius: radius.full,
    padding: 6,
  },
  verifiedBadge: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(6,6,14,0.75)',
    borderRadius: radius.full, padding: 2,
  },
  content: { padding: spacing.sm },
  name: { ...typography.bodyMd, color: colors.textPrimary, marginBottom: 2 },
  artisan: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rating: { ...typography.captionBold, color: colors.gold },
  reviewCount: { ...typography.caption, color: colors.textMuted },
  price: { ...typography.h4, color: colors.gold },
});
