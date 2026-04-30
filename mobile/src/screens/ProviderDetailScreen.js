/**
 * ProviderDetailScreen.js — Full provider/artisan detail page
 * Gallery, booking CTA, reviews, description, map location
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Image, Animated, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography, shadow, CATEGORIES, gradients } from '../utils/theme';
import { haptic, formatDistance, formatPrice, formatRating } from '../utils/helpers';
import {
  fetchProviderById, fetchReviews, toggleFavorite,
  fetchProviderActivities, resolveImageUrl
} from '../services/api';
import ActivityCard from '../components/cards/ActivityCard';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/ui/StarRating';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';
import { ListItemSkeleton } from '../components/ui/SkeletonLoader';

const { width, height } = Dimensions.get('window');
const COVER_H = height * 0.42;

export default function ProviderDetailScreen({ navigation, route }) {
  const provider = route?.params?.provider || {};
  const { user } = useAuth();

  const {
    id, name, category, commune, description, rating = 0, reviewCount = 0,
    price, priceUnit = '/session', coverImage, avatarUrl,
    location, distanceMeters, verified, phone, email: provEmail,
    schedule, maxParticipants,
    imageUrls = [], // Array from activity
  } = provider;

  const [reviews, setReviews]   = useState([]);
  const [loadingRev, setLoadingRev] = useState(true);
  const [isFav, setIsFav]       = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const catMeta   = CATEGORIES.find(c => c.id === category) || {};
  const catColor  = colors[category] || colors.gold;

  // Parallax effect
  const coverTranslate = scrollY.interpolate({ inputRange: [-COVER_H, 0, COVER_H], outputRange: [COVER_H / 2, 0, -COVER_H / 3], extrapolate: 'clamp' });
  const coverOpacity   = scrollY.interpolate({ inputRange: [0, COVER_H * 0.6], outputRange: [1, 0.4], extrapolate: 'clamp' });
  const headerOpacity  = scrollY.interpolate({ inputRange: [COVER_H * 0.5, COVER_H * 0.8], outputRange: [0, 1], extrapolate: 'clamp' });

  const [activities, setActivities] = useState([]);
  const [loadingAct, setLoadingAct] = useState(true);

  useEffect(() => {
    if (id) {
      setLoadingAct(true);
      fetchProviderActivities(id)
        .then(setActivities)
        .catch(console.warn)
        .finally(() => setLoadingAct(false));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReviews(id, 10)
        .then(setReviews)
        .catch(console.warn)
        .finally(() => setLoadingRev(false));
    } else {
      setLoadingRev(false);
    }
  }, [id]);

  const handleFavorite = async () => {
    if (!user) return;
    haptic.select();
    setIsFav(v => !v);
    try { await toggleFavorite(user.uid, id, 'provider'); }
    catch (e) { setIsFav(v => !v); }
  };

  const handleBook = () => {
    haptic.medium();
    // Sanitize provider data — ensure all image fields are strings
    const cleanProvider = {
      id: id || provider?.id,
      name: name || provider?.name || provider?.displayName || 'Prestataire',
      rating: rating || 0,
      category: category,
      commune: commune,
      avatarUrl: typeof provider?.avatarUrl === 'string' ? provider.avatarUrl : null,
      coverImage: typeof coverImage === 'string' ? coverImage : null,
      price: provider?.price || 0,
      priceUnit: provider?.priceUnit || 'session',
    };
    navigation.navigate('BookingFlow', { provider: cleanProvider });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated sticky header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.stickyBack}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={handleFavorite} style={styles.stickyFav}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? colors.danger : colors.textPrimary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 220 }}
      >
        {/* ── COVER IMAGE ── */}
        <Animated.View style={[styles.coverWrap, { transform: [{ translateY: coverTranslate }], opacity: coverOpacity }]}>
          {coverImage ? (
            <Image source={{ uri: resolveImageUrl(coverImage) }} style={styles.cover} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradients.moroccan} style={styles.cover} />
          )}
          <LinearGradient colors={['transparent', 'rgba(6,6,14,0.95)']} style={StyleSheet.absoluteFillObject} />

          {/* Category pill */}
          <View style={[styles.catPill, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            <Text style={styles.catEmoji}>{catMeta.emoji || '📍'}</Text>
            <Text style={[styles.catText, { color: catColor }]}>{catMeta.labelFr || category}</Text>
          </View>

          {/* Back & Fav (transparent) */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.coverBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFavorite} style={styles.coverFav}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? colors.danger : '#fff'} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── GALLERY ── */}
        {imageUrls.length > 1 && (
          <View style={styles.gallerySection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
              {imageUrls.map((url, idx) => (
                <TouchableOpacity key={idx} style={styles.galleryItem}>
                  <Image source={{ uri: resolveImageUrl(url) }} style={styles.galleryImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── CONTENT ── */}
        <View style={styles.content}>
          {/* Name + rating */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name || 'Prestataire'}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{commune || '—'}</Text>
                {distanceMeters != null && (
                  <Text style={styles.distance}>• {formatDistance(distanceMeters)}</Text>
                )}
                {verified && (
                  <>
                    <Text style={styles.dot}>•</Text>
                    <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                    <Text style={[styles.metaText, { color: colors.gold }]}>Vérifié</Text>
                  </>
                )}
              </View>
            </View>
            {/* Rating */}
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNum}>{formatRating(rating)}</Text>
              <StarRating rating={rating} size={14} />
              <Text style={styles.ratingCount}>({reviewCount})</Text>
            </View>
          </View>

          {/* Price */}
          <GlassCard style={styles.priceCard} goldBorder>
            <View style={{ flex: 1 }}>
              <Text style={styles.priceLabel}>Prix par {priceUnit?.replace('/', '')}</Text>
              <Text style={styles.priceValue}>{formatPrice(price)}<Text style={styles.priceUnit}>{priceUnit}</Text></Text>
            </View>
            {maxParticipants && (
              <View style={styles.maxPart}>
                <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                <Text style={styles.maxPartText}>Max {maxParticipants}</Text>
              </View>
            )}
          </GlassCard>

          {/* Activities Section */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>Nos Activités</Text>
            {loadingAct ? (
              <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />
            ) : activities.length === 0 ? (
              <Text style={styles.noReviews}>Aucune activité publiée pour le moment.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                {activities.map(act => (
                  <ActivityCard 
                    key={act.id} 
                    activity={act} 
                    onPress={() => navigation.navigate('ActivityDetail', { activity: act })}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Description */}
          {description && (
            <>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          )}

          {/* Schedule */}
          {schedule && (
            <>
              <Text style={styles.sectionTitle}>Horaires</Text>
              <GlassCard style={styles.scheduleCard}>
                {Object.entries(schedule).map(([day, hours]) => (
                  <View key={day} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{day}</Text>
                    <Text style={styles.scheduleHours}>{hours}</Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          {/* Contact */}
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactRow}>
            {phone && (
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="call-outline" size={18} color={colors.accent} />
                <Text style={styles.contactText}>{phone}</Text>
              </TouchableOpacity>
            )}
            {provEmail && (
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="mail-outline" size={18} color={colors.accent} />
                <Text style={styles.contactText} numberOfLines={1}>{provEmail}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reviews */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Avis ({reviewCount})</Text>
            <StarRating rating={rating} size={16} />
          </View>

          {loadingRev ? (
            [1,2,3].map(i => <ListItemSkeleton key={i} />)
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviews}>Aucun avis pour l'instant. Soyez le premier !</Text>
          ) : (
            reviews.map(r => (
              <GlassCard key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{(r.userName || 'A').charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{r.userName || 'Anonyme'}</Text>
                    <StarRating rating={r.rating} size={12} />
                  </View>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </GlassCard>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.bottomCta}>
        <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFillObject} />
        <View style={styles.ctaInner}>
          <View>
            <Text style={styles.ctaPrice}>{formatPrice(price)}</Text>
            <Text style={styles.ctaPriceUnit}>{priceUnit}</Text>
          </View>
          <AppButton title="Réserver Maintenant" onPress={handleBook} variant="marrakech" size="md" style={{ flex: 1, marginLeft: spacing.lg }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 100, height: 60,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: 10,
  },
  stickyBack:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stickyTitle: { ...typography.h4, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  stickyFav:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  coverWrap: { width, height: COVER_H, overflow: 'hidden' },
  cover:     { width: '100%', height: '100%' },
  catPill: {
    position: 'absolute', top: spacing.xxl, left: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: radius.full, borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catText:  { ...typography.tag },
  coverBack: { position: 'absolute', top: spacing.xl + 8, left: spacing.lg, padding: 8 },
  coverFav:  { position: 'absolute', top: spacing.xl + 8, right: spacing.lg, padding: 8 },

  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  name:    { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
  distance: { ...typography.caption, color: colors.accent },
  dot:      { ...typography.caption, color: colors.textMuted },
  ratingBox: { alignItems: 'center', gap: 4 },
  ratingNum: { ...typography.h2, color: colors.gold, fontWeight: '800' },
  ratingCount: { ...typography.caption, color: colors.textMuted },

  priceCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.lg },
  priceLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  priceValue: { ...typography.h2, color: colors.gold },
  priceUnit:  { ...typography.body, color: colors.textMuted, fontWeight: '400' },
  maxPart:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  maxPartText: { ...typography.caption, color: colors.textMuted },

  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  description:  { ...typography.body, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.md },

  scheduleCard: { padding: spacing.md, gap: spacing.xs },
  scheduleRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  scheduleDay:  { ...typography.bodyMd, color: colors.textPrimary },
  scheduleHours: { ...typography.body, color: colors.textMuted },

  contactRow: { gap: spacing.sm, marginBottom: spacing.md },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.accentGlow,
  },
  contactText: { ...typography.bodyMd, color: colors.accent, flex: 1 },

  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noReviews: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

  reviewCard:     { padding: spacing.md, marginBottom: spacing.md },
  reviewTop:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reviewAvatar:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { ...typography.h4, color: colors.gold },
  reviewerName:   { ...typography.bodyMd, color: colors.textPrimary },
  reviewComment:  { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  bottomCta: {
    position: 'absolute', bottom: 105, left: 0, right: 0,
    borderTopWidth: 1, borderColor: colors.goldBorder, overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl,
  },
  ctaPrice:     { ...typography.h3, color: colors.gold },
  ctaPriceUnit: { ...typography.caption, color: colors.textMuted },

  gallerySection: { marginTop: spacing.md, paddingLeft: spacing.lg },
  galleryScroll:  { gap: spacing.sm, paddingRight: spacing.lg },
  galleryItem:    { width: width * 0.6, height: 140, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  galleryImg:     { width: '100%', height: '100%', resizeMode: 'cover' },
});
