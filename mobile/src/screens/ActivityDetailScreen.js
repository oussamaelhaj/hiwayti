/**
 * ActivityDetailScreen.js — Full activity detail page
 * Gallery, specific activity details, booking CTA, reviews
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Image, Animated, StatusBar, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography, shadow, CATEGORIES, gradients } from '../utils/theme';
import { haptic, formatPrice, formatRating } from '../utils/helpers';
import { fetchReviews, toggleFavorite, resolveImageUrl, fetchProviderById } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/ui/StarRating';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';
import { ListItemSkeleton } from '../components/ui/SkeletonLoader';

const { width, height } = Dimensions.get('window');
const COVER_H = height * 0.45;

export default function ActivityDetailScreen({ navigation, route }) {
  const activity = route?.params?.activity || {};
  const { user } = useAuth();

  const {
    id, name, category, commune, description, rating = 0, reviewCount = 0,
    price, priceUnit = 'personne', imageUrl, imageUrls = [],
    duration, difficulty, languages = [], included = [], excluded = [],
    requirements = [], meetingPoint, providerId, providerName: initialProviderName
  } = activity;

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingRev, setLoadingRev] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const catMeta = CATEGORIES.find(c => c.id === category) || {};
  const catColor = colors[category] || colors.gold;

  // Header animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [COVER_H * 0.6, COVER_H * 0.9],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-COVER_H, 0],
    outputRange: [2, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    if (id) {
      // Fetch activity reviews
      fetchReviews(id, 10)
        .then(setReviews)
        .catch(console.warn)
        .finally(() => setLoadingRev(false));
      
      // Fetch provider info for the badge
      if (providerId) {
        fetchProviderById(providerId)
          .then(setProvider)
          .catch(console.warn);
      }
    }
  }, [id, providerId]);

  const handleFavorite = async () => {
    if (!user) return Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter des favoris.');
    haptic.select();
    const newStatus = !isFav;
    setIsFav(newStatus);
    try { 
      await toggleFavorite(user.uid, id, 'activity'); 
    } catch (e) { 
      setIsFav(!newStatus); 
      Alert.alert('Erreur', 'Impossible de mettre à jour vos favoris.');
    }
  };

  const handleBook = () => {
    haptic.medium();
    navigation.navigate('Booking', { 
      activity: activity,
      provider: provider || { id: providerId, name: initialProviderName }
    });
  };

  const allImages = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? colors.danger : colors.textPrimary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Animated.Image 
            source={{ uri: resolveImageUrl(imageUrl) || 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=800' }} 
            style={[styles.heroImg, { transform: [{ scale: imageScale }] }]}
          />
          <LinearGradient colors={['rgba(6,6,14,0.3)', 'rgba(6,6,14,0.95)']} style={StyleSheet.absoluteFillObject} />
          
          <SafeAreaView style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} style={styles.heroBtn}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? colors.danger : "#fff"} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroBottom}>
              <View style={[styles.catBadge, { backgroundColor: catColor + 'dd' }]}>
                <Text style={styles.catBadgeText}>{catMeta.emoji} {catMeta.labelFr}</Text>
              </View>
              <Text style={styles.title}>{name}</Text>
              <View style={styles.ratingRow}>
                <StarRating rating={rating} size={16} />
                <Text style={styles.ratingText}>{formatRating(rating)} ({reviewCount} avis)</Text>
              </View>
            </SafeAreaView>
          </View>
        </View>

        <View style={styles.content}>
          {/* Main Info Strip */}
          <GlassCard style={styles.infoStrip} noBlur>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={colors.gold} />
              <Text style={styles.infoValue}>{duration || '2h'}</Text>
              <Text style={styles.infoLabel}>Durée</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="speedometer-outline" size={20} color={colors.gold} />
              <Text style={styles.infoValue}>{difficulty || 'Tous'}</Text>
              <Text style={styles.infoLabel}>Niveau</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="language-outline" size={20} color={colors.gold} />
              <Text style={styles.infoValue}>{languages[0] || 'FR/AR'}</Text>
              <Text style={styles.infoLabel}>Langues</Text>
            </View>
          </GlassCard>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          {/* Provider Badge */}
          {provider && (
            <TouchableOpacity 
              style={styles.providerCard}
              onPress={() => navigation.navigate('ProviderDetail', { provider })}
            >
              <Image source={{ uri: resolveImageUrl(provider.avatarUrl) || 'https://i.pravatar.cc/100' }} style={styles.providerAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.providedBy}>Proposé par</Text>
                <Text style={styles.providerName}>{provider.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Gallery */}
          {allImages.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Galerie Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {allImages.map((img, i) => (
                  <TouchableOpacity key={i} style={styles.galleryItem}>
                    <Image source={{ uri: resolveImageUrl(img) }} style={styles.galleryImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Included / Excluded */}
          <View style={styles.featureRow}>
            <View style={styles.featureCol}>
              <Text style={styles.sectionTitle}>Inclus</Text>
              {included.length > 0 ? included.map((item, i) => (
                <View key={i} style={styles.checkItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.checkText}>{item}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Aucun détail</Text>}
            </View>
            <View style={styles.featureCol}>
              <Text style={styles.sectionTitle}>Non Inclus</Text>
              {excluded.length > 0 ? excluded.map((item, i) => (
                <View key={i} style={styles.checkItem}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text style={styles.checkText}>{item}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Aucun détail</Text>}
            </View>
          </View>

          {/* Meeting Point */}
          {meetingPoint && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Point de rendez-vous</Text>
              <GlassCard style={styles.meetingCard} noBlur>
                <Ionicons name="location" size={20} color={colors.gold} />
                <Text style={styles.meetingText}>{meetingPoint}</Text>
              </GlassCard>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avis clients</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {loadingRev ? <ListItemSkeleton /> : reviews.length === 0 ? (
              <Text style={styles.emptyText}>Aucun avis pour le moment.</Text>
            ) : (
              reviews.map(rev => (
                <GlassCard key={rev.id} style={styles.reviewCard} noBlur>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewerName}>{rev.userName || 'Utilisateur'}</Text>
                    <StarRating rating={rev.rating} size={12} />
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </GlassCard>
              ))
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFillObject} />
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPriceLabel}>À partir de</Text>
            <Text style={styles.bottomPrice}>{formatPrice(price)}<Text style={styles.bottomPriceUnit}>/{priceUnit}</Text></Text>
          </View>
          <AppButton 
            title="Réserver maintenant" 
            onPress={handleBook}
            gradient={gradients.gold}
            style={styles.bookBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    height: 100,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 15, paddingHorizontal: spacing.lg,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  stickyTitle: {
    ...typography.bodyBold, color: colors.textPrimary,
    flex: 1, textAlign: 'center', marginHorizontal: 15,
  },
  hero: {
    height: COVER_H,
    overflow: 'hidden',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
  },
  heroBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.sm, marginBottom: 12,
  },
  catBadgeText: {
    ...typography.captionBold, color: '#fff', fontSize: 12,
  },
  title: {
    ...typography.h1, color: '#fff', marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  ratingText: {
    ...typography.caption, color: 'rgba(255,255,255,0.8)',
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -30,
  },
  infoStrip: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
    justifyContent: 'space-around',
    ...shadow.lg,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoValue: {
    ...typography.bodyBold, color: colors.textPrimary, marginTop: 4,
  },
  infoLabel: {
    ...typography.caption, color: colors.textMuted,
  },
  infoDivider: {
    width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4, color: colors.textPrimary, marginBottom: 12,
  },
  descriptionText: {
    ...typography.body, color: colors.textSecondary, lineHeight: 24,
  },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, padding: spacing.md,
    borderRadius: radius.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  providerAvatar: {
    width: 50, height: 50, borderRadius: 25,
  },
  providedBy: {
    ...typography.caption, color: colors.textMuted,
  },
  providerName: {
    ...typography.bodyBold, color: colors.gold,
  },
  galleryScroll: {
    gap: spacing.md,
  },
  galleryItem: {
    width: width * 0.6, height: 160,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  galleryImg: {
    width: '100%', height: '100%',
  },
  featureRow: {
    flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl,
  },
  featureCol: {
    flex: 1,
  },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  checkText: {
    ...typography.caption, color: colors.textSecondary,
  },
  emptyText: {
    ...typography.caption, color: colors.textMuted, fontStyle: 'italic',
  },
  meetingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: spacing.md,
  },
  meetingText: {
    ...typography.body, color: colors.textSecondary, flex: 1,
  },
  reviewsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    ...typography.captionBold, color: colors.gold,
  },
  reviewCard: {
    padding: spacing.md, marginBottom: spacing.sm,
  },
  reviewTop: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  reviewerName: {
    ...typography.captionBold, color: colors.textPrimary,
  },
  reviewComment: {
    ...typography.caption, color: colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 25, paddingHorizontal: spacing.lg,
  },
  bottomInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: '100%',
  },
  bottomPriceLabel: {
    ...typography.caption, color: colors.textMuted,
  },
  bottomPrice: {
    ...typography.h3, color: colors.gold,
  },
  bottomPriceUnit: {
    fontSize: 14, color: colors.textMuted,
  },
  bookBtn: {
    width: width * 0.5,
  }
});
