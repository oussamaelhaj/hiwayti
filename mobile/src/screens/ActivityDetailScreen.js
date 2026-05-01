/**
 * ActivityDetailScreen.js — Premium activity detail page
 * Airbnb/Booking-inspired: Full-bleed gallery, immersive design, smooth booking CTA
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Dimensions, Animated, StatusBar, Alert, SafeAreaView, Platform,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography, shadow, CATEGORIES, gradients } from '../utils/theme';
import { haptic, formatPrice, formatRating } from '../utils/helpers';
import { fetchReviews, toggleFavorite, fetchProviderById, addReview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/ui/StarRating';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';
import Image from '../components/ui/Image';
import { ListItemSkeleton } from '../components/ui/SkeletonLoader';

const { width, height } = Dimensions.get('window');
const GALLERY_H = height * 0.52; // Large Airbnb-style gallery height

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const catMeta = CATEGORIES.find(c => c.id === category) || {};
  const catColor = colors[category] || colors.gold;

  // Header animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [GALLERY_H * 0.4, GALLERY_H * 0.7],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-GALLERY_H, 0],
    outputRange: [1.6, 1],
    extrapolate: 'clamp'
  });

  const loadReviews = async () => {
    if (!id) return;
    setLoadingRev(true);
    try {
      const data = await fetchReviews(id, 10);
      setReviews(data);
    } catch (e) { console.warn(e); }
    setLoadingRev(false);
  };

  useEffect(() => {
    loadReviews();
    if (id && providerId) {
      fetchProviderById(providerId)
        .then(setProvider)
        .catch(console.warn);
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
    
    // Build robust provider data — prioritize fetched provider, then activity metadata
    const providerData = provider ? {
      id: provider.id || providerId,
      name: provider.name || provider.displayName || initialProviderName || 'Prestataire',
      rating: provider.rating || 0,
      avatarUrl: typeof provider.avatarUrl === 'string' ? provider.avatarUrl : null,
      coverImage: typeof provider.coverImage === 'string' ? provider.coverImage : null,
    } : { 
      id: providerId || activity.providerId, 
      name: initialProviderName || activity.providerName || 'Prestataire',
      rating: activity.providerRating || 0,
      avatarUrl: typeof activity.providerAvatar === 'string' ? activity.providerAvatar : null,
    };

    if (!providerData.id) {
      return Alert.alert('Erreur', 'Informations sur le prestataire manquantes. Veuillez réessayer.');
    }

    // Build clean activity data with only string imageUrl
    const firstImage = typeof imageUrl === 'string' ? imageUrl
      : (Array.isArray(imageUrls) && imageUrls.length > 0 && typeof imageUrls[0] === 'string') ? imageUrls[0]
      : null;

    const activityData = {
      id: id || activity.id,
      name: name || activity.name || 'Activité',
      price: price || activity.price || 0,
      priceUnit: priceUnit || activity.priceUnit || 'personne',
      category: category || activity.category,
      communeId: activity.communeId,
      communeName: activity.communeName || commune,
      imageUrl: firstImage,
      providerId: providerData.id,
      providerName: providerData.name,
      duration: duration,
    };

    navigation.navigate('BookingFlow', { 
      activity: activityData,
      provider: providerData
    });
  };

  const handleSubmitReview = async () => {
    if (!user) return Alert.alert('Connexion requise', 'Veuillez vous connecter pour laisser un avis.');
    if (newRating === 0) return Alert.alert('Note manquante', 'Veuillez sélectionner une note.');
    
    setSubmittingReview(true);
    try {
      await addReview({
        targetId: id,
        targetType: 'activity',
        rating: newRating,
        comment: newComment,
        userName: user.displayName || user.email.split('@')[0],
      });
      haptic.success();
      setNewRating(0);
      setNewComment('');
      setShowReviewModal(false);
      loadReviews();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de publier votre avis.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Build gallery images — ensure all are valid strings
  const allImages = (() => {
    const raw = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
    const valid = raw.filter(img => typeof img === 'string' && img.length > 0);
    return valid.length > 0 ? valid : ['https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=800'];
  })();

  const onScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Sticky Animated Header ── */}
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
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ══════════════ HERO GALLERY — Airbnb / Booking style ══════════════ */}
        <View style={styles.gallery}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: imageScale }] }]}>
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              keyExtractor={(_, i) => `gallery-${i}`}
              renderItem={({ item }) => (
                <View style={styles.gallerySlide}>
                  <Image source={item} style={StyleSheet.absoluteFillObject} />
                </View>
              )}
            />
          </Animated.View>

          {/* Gradient overlay at bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(6,6,14,0.15)', 'rgba(6,6,14,0.92)']}
            locations={[0, 0.5, 1]}
            style={styles.galleryGradient}
            pointerEvents="none"
          />

          {/* Gallery pagination dots */}
          {allImages.length > 1 && (
            <View style={styles.pagination}>
              {allImages.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    activeImageIndex === i ? styles.dotActive : styles.dotInactive
                  ]} 
                />
              ))}
            </View>
          )}

          {/* Image counter badge */}
          {allImages.length > 1 && (
            <View style={styles.imageCounter}>
              <Ionicons name="images-outline" size={12} color="#fff" />
              <Text style={styles.imageCounterText}>{activeImageIndex + 1}/{allImages.length}</Text>
            </View>
          )}

          {/* Floating Back & Fav buttons */}
          <SafeAreaView style={styles.galleryOverlay}>
            <View style={styles.galleryHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.galleryBtn}>
                <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.galleryActions}>
                <TouchableOpacity style={styles.galleryBtn}>
                  <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name="share-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleFavorite} style={styles.galleryBtn}>
                  <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.danger : "#fff"} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Hero bottom info overlay */}
          <View style={styles.heroInfo}>
            <View style={[styles.catBadge, { backgroundColor: catColor + 'dd' }]}>
              <Text style={styles.catBadgeText}>{catMeta.emoji} {catMeta.labelFr}</Text>
            </View>
            <Text style={styles.title}>{name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText}>{activity.communeName || commune || 'Maroc'}</Text>
              <View style={styles.dotSeparator} />
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText}>{duration || '2h'}</Text>
              <View style={styles.dotSeparator} />
              <Ionicons name="star" size={13} color={colors.gold} />
              <Text style={[styles.metaText, { color: colors.gold, fontWeight: '700' }]}>{formatRating(rating)}</Text>
              <Text style={[styles.metaText, { marginLeft: 2 }]}>({reviewCount})</Text>
            </View>
          </View>
        </View>

        {/* ══════════════ CONTENT SECTION ══════════════ */}
        <View style={styles.content}>

          {/* Quick info strip */}
          <GlassCard style={styles.infoStrip} noBlur>
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="time-outline" size={22} color={colors.gold} />
              </View>
              <Text style={styles.infoValue}>{duration || '2h'}</Text>
              <Text style={styles.infoLabel}>Durée</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="speedometer-outline" size={22} color={colors.gold} />
              </View>
              <Text style={styles.infoValue}>{difficulty || 'Tous'}</Text>
              <Text style={styles.infoLabel}>Niveau</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="language-outline" size={22} color={colors.gold} />
              </View>
              <Text style={styles.infoValue}>{languages[0] || 'FR/AR'}</Text>
              <Text style={styles.infoLabel}>Langues</Text>
            </View>
          </GlassCard>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos de cette expérience</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          {/* Provider Badge */}
          {(provider || initialProviderName) && (
            <TouchableOpacity 
              style={styles.providerCard}
              onPress={() => provider && navigation.navigate('ProviderDetail', { provider })}
              activeOpacity={0.85}
            >
              <Image 
                source={provider?.avatarUrl || activity.providerAvatar} 
                style={styles.providerAvatar} 
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.providedBy}>Proposé par</Text>
                <Text style={styles.providerNameText}>{provider?.name || provider?.displayName || initialProviderName || 'Prestataire'}</Text>
                {provider?.rating > 0 && (
                  <View style={styles.providerRating}>
                    <Ionicons name="star" size={11} color={colors.gold} />
                    <Text style={styles.providerRatingText}>{provider.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.providerArrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          {/* Included / Excluded */}
          {(included.length > 0 || excluded.length > 0) && (
            <View style={styles.featureRow}>
              {included.length > 0 && (
                <View style={styles.featureCol}>
                  <Text style={styles.sectionTitle}>Inclus</Text>
                  {included.map((item, i) => (
                    <View key={i} style={styles.checkItem}>
                      <View style={[styles.checkIcon, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark" size={14} color={colors.success} />
                      </View>
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {excluded.length > 0 && (
                <View style={styles.featureCol}>
                  <Text style={styles.sectionTitle}>Non inclus</Text>
                  {excluded.map((item, i) => (
                    <View key={i} style={styles.checkItem}>
                      <View style={[styles.checkIcon, { backgroundColor: colors.danger + '20' }]}>
                        <Ionicons name="close" size={14} color={colors.danger} />
                      </View>
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prérequis</Text>
              {requirements.map((req, i) => (
                <View key={i} style={styles.checkItem}>
                  <View style={[styles.checkIcon, { backgroundColor: colors.gold + '20' }]}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.gold} />
                  </View>
                  <Text style={styles.checkText}>{req}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Meeting Point */}
          {meetingPoint && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Point de rencontre</Text>
              <GlassCard style={styles.meetingCard} noBlur>
                <View style={styles.meetingIcon}>
                  <Ionicons name="navigate-circle" size={28} color={colors.gold} />
                </View>
                <Text style={styles.meetingText}>{meetingPoint}</Text>
              </GlassCard>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avis clients</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(true)}>
                <Text style={styles.seeAllText}>Laisser un avis</Text>
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

      {/* ══════════════ BOTTOM BOOKING BAR ══════════════ */}
      <View style={styles.bottomBar}>
        <BlurView tint="dark" intensity={85} style={StyleSheet.absoluteFillObject} />
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPriceLabel}>À partir de</Text>
            <Text style={styles.bottomPrice}>{formatPrice(price)}<Text style={styles.bottomPriceUnit}>/{priceUnit}</Text></Text>
          </View>
          <AppButton 
            title="Réserver" 
            onPress={handleBook}
            gradient={gradients.gold}
            style={styles.bookBtn}
            icon={<Ionicons name="calendar-outline" size={18} color={colors.bg} />}
          />
        </View>
      </View>

      {/* REVIEW MODAL */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFillObject}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}
          >
            <View style={styles.reviewModalContent}>
              <Text style={styles.modalTitle}>Votre avis compte</Text>
              <Text style={styles.modalSub}>Comment s'est passée votre activité {name} ?</Text>
              
              <View style={styles.starRow}>
                <StarRating 
                  interactive 
                  rating={newRating} 
                  onRate={setNewRating} 
                  size={40} 
                />
              </View>

              <TextInput
                style={styles.reviewInput}
                placeholder="Écrivez votre commentaire ici..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={newComment}
                onChangeText={setNewComment}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} 
                  onPress={() => setShowReviewModal(false)}
                >
                  <Text style={{ color: colors.textSecondary }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.gold }]} 
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={{ color: colors.bg, fontWeight: '700' }}>Publier</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Sticky header ──
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    height: Platform.OS === 'ios' ? 100 : 90,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 12, paddingHorizontal: spacing.lg,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  stickyTitle: {
    ...typography.bodyBold, color: colors.textPrimary,
    flex: 1, textAlign: 'center', marginHorizontal: 12,
  },

  // ── Gallery (Airbnb-style) ──
  gallery: {
    height: GALLERY_H,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.bgCard,
  },
  gallerySlide: {
    width,
    height: GALLERY_H,
  },
  galleryGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
  },
  galleryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryBtn: {
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    zIndex: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.gold,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 92,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    zIndex: 20,
  },
  imageCounterText: {
    ...typography.captionBold,
    color: '#fff',
    fontSize: 11,
  },

  // ── Hero info overlay ──
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    zIndex: 5,
  },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.sm, marginBottom: 12,
  },
  catBadgeText: {
    ...typography.captionBold, color: '#fff', fontSize: 12,
  },
  title: {
    ...typography.h1, color: '#fff', marginBottom: 10, fontSize: 26,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
  },
  metaText: {
    ...typography.caption, color: 'rgba(255,255,255,0.85)', marginLeft: 4,
  },
  dotSeparator: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 10,
  },

  // ── Content ──
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -20,
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
  infoIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  infoValue: {
    ...typography.bodyBold, color: colors.textPrimary, marginTop: 2, fontSize: 14,
  },
  infoLabel: {
    ...typography.caption, color: colors.textMuted, fontSize: 11,
  },
  infoDivider: {
    width: 1, height: '50%', backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },

  // ── Section ──
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4, color: colors.textPrimary, marginBottom: 14, fontSize: 17,
  },
  descriptionText: {
    ...typography.body, color: colors.textSecondary, lineHeight: 24,
  },

  // ── Provider card ──
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.bgCard, padding: spacing.md + 2,
    borderRadius: radius.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  providerAvatar: {
    width: 52, height: 52, borderRadius: 26,
  },
  providedBy: {
    ...typography.caption, color: colors.textMuted, fontSize: 11,
  },
  providerNameText: {
    ...typography.bodyBold, color: colors.gold, marginTop: 1,
  },
  providerRating: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2,
  },
  providerRatingText: {
    ...typography.captionBold, color: colors.gold, fontSize: 11,
  },
  providerArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Features ──
  featureRow: {
    flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl,
  },
  featureCol: {
    flex: 1,
  },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  checkIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: {
    ...typography.caption, color: colors.textSecondary, flex: 1,
  },
  emptyText: {
    ...typography.caption, color: colors.textMuted, fontStyle: 'italic',
  },

  // ── Meeting point ──
  meetingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: spacing.md,
  },
  meetingIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  meetingText: {
    ...typography.body, color: colors.textSecondary, flex: 1,
  },

  // ── Reviews ──
  reviewsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  seeAllText: {
    ...typography.captionBold, color: colors.gold,
  },
  reviewCard: {
    padding: spacing.md, marginBottom: spacing.sm,
  },
  reviewTop: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  reviewerName: {
    ...typography.captionBold, color: colors.textPrimary,
  },
  reviewComment: {
    ...typography.caption, color: colors.textSecondary, lineHeight: 20,
  },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  bottomInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: '100%',
  },
  bottomPriceLabel: {
    ...typography.caption, color: colors.textMuted, marginBottom: 2,
  },
  bottomPrice: {
    ...typography.h3, color: colors.gold, fontSize: 22,
  },
  bottomPriceUnit: {
    fontSize: 14, color: colors.textMuted, fontWeight: '400',
  },
  bookBtn: {
    minWidth: width * 0.42,
  },

  reviewModalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    gap: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  modalSub: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  starRow: { alignSelf: 'center', marginBottom: spacing.md },
  reviewInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalBtn: {
    flex: 1, height: 50, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
});
