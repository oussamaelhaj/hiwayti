/**
 * HomeScreen.js — HIWAYTI Main Marketplace Home v2
 * Real stats from Firestore, improved category/commune/activity linking
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  RefreshControl, Animated, Dimensions, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { colors, spacing, radius, typography, CATEGORIES, gradients, shadow } from '../utils/theme';
import { haptic, formatDistance } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import {
  fetchFeaturedProviders, fetchTopArtisans, fetchNearbyProviders,
  fetchAllCommunes, fetchPlatformStats, fetchActivitiesByCategory,
} from '../services/api';
import { getAIRecommendations } from '../services/aiEngine';
import ProviderCard from '../components/cards/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/SkeletonLoader';
import GlassCard from '../components/ui/GlassCard';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();

  const [featured, setFeatured] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [aiRecs, setAiRecs] = useState([]);
  const [communesList, setCommunesList] = useState([]);
  const [platformStats, setPlatformStats] = useState({ providers: 0, communes: 0, activities: 0, bookings: 0 });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [trendingActivities, setTrendingActivities] = useState([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });

  const loadData = useCallback(async (loc = location) => {
    try {
      const [feat, arts, comms, stats] = await Promise.all([
        fetchFeaturedProviders(6),
        fetchTopArtisans(6),
        fetchAllCommunes(10),
        fetchPlatformStats(),
      ]);
      setFeatured(feat);
      setArtisans(arts);
      setCommunesList(comms);
      setPlatformStats(stats);

      // Load trending activities based on user interests
      let interests = userProfile?.interests || [];
      if (interests.length === 0 && activeCategory) interests = [activeCategory];
      if (interests.length === 0) interests = ['surf', 'artisanat']; // Fallback

      const actsPromises = interests.slice(0, 3).map(cat => fetchActivitiesByCategory(cat, 4));
      const actsResults = await Promise.allSettled(actsPromises);
      const allActs = actsResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);
      
      setTrendingActivities(allActs.slice(0, 8));

      if (loc) {
        const near = await fetchNearbyProviders(loc.coords.latitude, loc.coords.longitude, 50);
        setNearby(near.slice(0, 10));
        const recs = await getAIRecommendations(userProfile || {}, { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, 6);
        setAiRecs(recs);
      }
    } catch (e) {
      console.warn('[HOME] Load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, activeCategory]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
        loadData(loc);
      } else {
        loadData(null);
      }
    })();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    loadData();
  };

  const onCategoryPress = useCallback(async (catId) => {
    haptic.select();
    setActiveCategory(catId === activeCategory ? null : catId);
  }, [activeCategory]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const navigateToProvider = (provider) => {
    navigation.navigate('ProviderDetail', { provider });
  };

  // Format stat number nicely
  const formatStat = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
    return n > 0 ? `${n}+` : '…';
  };

  // ── Section header ──
  const SectionHeader = ({ titleKey, title, onSeeAll }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title || t(titleKey)}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sticky blur header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.stickyTitle}>HIWAYTI</Text>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── HERO ─── */}
        <View style={styles.hero}>
          <LinearGradient colors={['#06060e', '#0a0714', '#06060e']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroOrb} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>{greeting()}, {user?.displayName?.split(' ')[0] || 'Explorateur'} 👋</Text>
              <Text style={styles.heroTitle}>Découvrez{'\n'}le Maroc Authentique</Text>
              <Text style={styles.heroSub}>Sports • Artisanat • Culture</Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Real Stats strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsStrip}>
            {[
              { label: 'Prestataires', value: formatStat(platformStats.providers), icon: 'business-outline', color: colors.gold },
              { label: 'Communes', value: platformStats.communes > 0 ? `${platformStats.communes}` : '1 503', icon: 'map-outline', color: colors.accent },
              { label: 'Activités', value: formatStat(platformStats.activities), icon: 'tennisball-outline', color: colors.success },
              { label: 'Réservations', value: formatStat(platformStats.bookings), icon: 'calendar-outline', color: colors.goldLight },
            ].map((s, i) => (
              <GlassCard key={i} style={styles.statCard} noBlur>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            ))}
          </ScrollView>
        </View>

        {/* ── CATEGORY PILLS ─── */}
        <View style={{ paddingVertical: spacing.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            <TouchableOpacity
              style={[styles.catPill, !activeCategory && styles.catPillActive]}
              onPress={() => onCategoryPress(null)}
            >
              <Text style={[styles.catText, !activeCategory && { color: colors.bg }]}>Tous</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catPill, { borderColor: cat.color + '55' }, active && { backgroundColor: cat.color }]}
                  onPress={() => onCategoryPress(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catText, active && { color: colors.bg }]}>{cat.labelFr}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── POPULAR DESTINATIONS (COMMUNES) ─── */}
        <SectionHeader title="Destinations Populaires" onSeeAll={() => navigation.navigate('Discover')} />
        <FlatList
          data={communesList}
          horizontal
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.communeCard}
              onPress={() => navigation.navigate('Discover', { communeId: item.id })}
            >
              <Image
                source={{ uri: item.coverImage || `https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=300` }}
                style={styles.communeImage}
              />
              <LinearGradient colors={['transparent', 'rgba(6,6,14,0.9)']} style={styles.communeOverlay}>
                <Text style={styles.communeName}>{item.name}</Text>
                {item.region && <Text style={styles.communeRegion}>{item.region}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={loading ? <ProviderCardSkeleton /> : <EmptyBlock message="Aucune destination trouvée" />}
        />

        {/* ── FEATURED EXPERIENCES ─── */}
        <SectionHeader title="Expériences à la Une" onSeeAll={() => navigation.navigate('Discover')} />
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            renderItem={() => <ProviderCardSkeleton />}
            keyExtractor={(_, i) => `sk-${i}`}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={featured.filter(p => !activeCategory || p.category === activeCategory)}
            horizontal
            renderItem={({ item }) => (
              <ProviderCard provider={item} onPress={() => navigateToProvider(item)} />
            )}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={<EmptyBlock message="Aucune expérience en vedette" />}
          />
        )}

        {/* ── TRENDING ACTIVITIES ─── */}
        {trendingActivities.length > 0 && (
          <>
            <SectionHeader
              title={activeCategory
                ? `Activités · ${CATEGORIES.find(c => c.id === activeCategory)?.labelFr}`
                : 'Activités Tendances'}
              onSeeAll={() => navigation.navigate('Discover')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              {trendingActivities.map(act => (
                <TouchableOpacity
                  key={act.id}
                  style={styles.activityCard}
                  onPress={() => navigation.navigate('ProviderDetail', { provider: { id: act.providerId, ...act } })}
                >
                  <View style={[styles.activityIconBg, { backgroundColor: (colors[act.category] || colors.gold) + '22' }]}>
                    <Text style={{ fontSize: 28 }}>
                      {CATEGORIES.find(c => c.id === act.category)?.emoji || '🎯'}
                    </Text>
                  </View>
                  <Text style={styles.activityName} numberOfLines={2}>{act.name}</Text>
                  <Text style={styles.activityPrice}>{act.price ? `${act.price} MAD` : 'Sur devis'}</Text>
                  <View style={styles.activityMeta}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.activityDuration}>{act.duration || '—'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── NEAR YOU ─── */}
        {nearby.length > 0 && (
          <>
            <SectionHeader title="Près de Vous" onSeeAll={() => navigation.navigate('MapTab')} />
            <FlatList
              data={nearby.filter(p => !activeCategory || p.category === activeCategory)}
              horizontal
              renderItem={({ item }) => (
                <ProviderCard provider={item} showDistance onPress={() => navigateToProvider(item)} />
              )}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={<EmptyBlock message="Aucun prestataire à proximité" />}
            />
          </>
        )}

        {/* ── TOP ARTISANS ─── */}
        <SectionHeader title="Top Artisans" onSeeAll={() => navigation.navigate('Shop')} />
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            renderItem={() => <ProviderCardSkeleton />}
            keyExtractor={(_, i) => `sk2-${i}`}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={artisans}
            horizontal
            renderItem={({ item }) => (
              <ProviderCard provider={item} onPress={() => navigateToProvider(item)} />
            )}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={<EmptyBlock message="Aucun artisan trouvé" />}
          />
        )}

        {/* ── AI RECOMMENDATIONS ─── */}
        {aiRecs.length > 0 && (
          <>
            <SectionHeader title="Recommandé pour vous" />
            <View style={styles.aiSection}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color={colors.gold} />
                <Text style={styles.aiBadgeText}>IA Personnalisée</Text>
              </View>
              {aiRecs.slice(0, 4).map(item => (
                <ProviderCard
                  key={item.id}
                  provider={item}
                  horizontal={false}
                  showDistance
                  onPress={() => navigateToProvider(item)}
                />
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

function EmptyBlock({ message }) {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Text style={{ color: colors.textMuted, ...typography.body }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    height: 60,
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  stickyTitle: { ...typography.h3, color: colors.gold, letterSpacing: 2 },

  hero: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: colors.goldGlow,
    top: -60, right: -60,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroGreeting: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  heroTitle: { ...typography.h1, color: colors.textPrimary, lineHeight: 38 },
  heroSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  statsStrip: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  statCard: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    alignItems: 'center', gap: 4, minWidth: 88,
  },
  statValue: { ...typography.h4, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.textMuted },

  catScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  catEmoji: { fontSize: 14 },
  catText: { ...typography.captionBold, color: colors.textSecondary },

  communeCard: {
    width: 140, height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  communeImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  communeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  communeName: { ...typography.h4, color: '#FFF' },
  communeRegion: { ...typography.caption, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Activity cards
  activityCard: {
    width: 140,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activityIconBg: {
    width: 52, height: 52, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  activityName: { ...typography.bodyMd, color: colors.textPrimary, lineHeight: 18 },
  activityPrice: { ...typography.captionBold, color: colors.gold },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activityDuration: { ...typography.caption, color: colors.textMuted },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  seeAll: { ...typography.captionBold, color: colors.gold },

  aiSection: { paddingHorizontal: spacing.lg },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.goldGlow,
    borderRadius: radius.full,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.goldBorder,
    marginBottom: spacing.md,
  },
  aiBadgeText: { ...typography.tag, color: colors.gold },
});
