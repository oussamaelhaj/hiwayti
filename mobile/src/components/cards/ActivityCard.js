/**
 * ActivityCard.js — Premium card for displaying sports & craft activities
 * Includes rating, price, category badge, and favorite toggle
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, CATEGORIES, shadow } from '../../utils/theme';
import { formatPrice, haptic } from '../../utils/helpers';
import { resolveImageUrl } from '../../services/api';
import GlassCard from '../ui/GlassCard';

export default function ActivityCard({ activity, onPress, onFavPress, isFavorite, horizontal = false }) {
  const {
    name, category, price, priceUnit = 'personne', imageUrl, rating = 0, reviewCount = 0,
    duration, difficulty, commune
  } = activity;

  const catMeta = CATEGORIES.find(c => c.id === category) || {};
  const catColor = colors[category] || colors.gold;

  const handleFav = () => {
    haptic.light();
    onFavPress && onFavPress(activity.id);
  };

  const content = (
    <View style={horizontal ? styles.horizontalContainer : styles.container}>
      {/* Image Wrap */}
      <View style={horizontal ? styles.imageWrapHoriz : styles.imageWrap}>
        <Image
          source={{ uri: resolveImageUrl(imageUrl) || 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=400' }}
          style={styles.image}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(6,6,14,0.4)', 'transparent', 'rgba(6,6,14,0.8)']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Category Badge */}
        <View style={[styles.badge, { backgroundColor: catColor + 'dd' }]}>
          <Text style={styles.badgeText}>{catMeta.emoji} {catMeta.labelFr}</Text>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity style={styles.favBtn} onPress={handleFav}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={18} 
            color={isFavorite ? colors.danger : "#fff"} 
          />
        </TouchableOpacity>
      </View>

      {/* Info Wrap */}
      <View style={styles.info}>
        <View style={styles.metaRow}>
          <Text style={styles.communeText}>{commune || 'Maroc'}</Text>
          <View style={styles.dot} />
          <Text style={styles.durationText}>{duration || '2h'}</Text>
        </View>

        <Text style={styles.name} numberOfLines={horizontal ? 1 : 2}>{name}</Text>
        
        <View style={styles.bottomRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
            <Text style={styles.reviewCount}>({reviewCount})</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            <Text style={styles.priceUnit}>/{priceUnit}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <GlassCard style={[styles.card, horizontal && styles.cardHoriz]} noBlur>
        {content}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
    borderRadius: radius.xl,
    ...shadow.md,
  },
  cardHoriz: {
    width: '100%',
    marginRight: 0,
    marginBottom: spacing.md,
  },
  horizontalContainer: {
    flexDirection: 'row',
  },
  container: {
    flexDirection: 'column',
  },
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: colors.bgCard,
  },
  imageWrapHoriz: {
    width: 120,
    height: 120,
    backgroundColor: colors.bgCard,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.captionBold,
    color: '#fff',
    fontSize: 10,
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: spacing.md,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  communeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  durationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 6,
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    height: 40,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.captionBold,
    color: colors.gold,
    fontSize: 12,
  },
  reviewCount: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  priceRow: {
    alignItems: 'flex-end',
  },
  price: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  priceUnit: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: -2,
  },
});
