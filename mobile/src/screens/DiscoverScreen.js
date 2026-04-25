/**
 * DiscoverScreen.js — HIWAYTI Full Provider Discovery
 * Search, filters, sort, full provider list
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic } from '../utils/helpers';
import { fetchFeaturedProviders, fetchProvidersByCategory } from '../services/api';
import ProviderCard from '../components/cards/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/SkeletonLoader';
import GlassCard from '../components/ui/GlassCard';

const SORT_OPTIONS = [
  { key: 'rating', label: 'Note' },
  { key: 'price_asc', label: 'Prix ↑' },
  { key: 'price_desc', label: 'Prix ↓' },
  { key: 'distance', label: 'Distance' },
];

export default function DiscoverScreen({ navigation }) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortKey, setSortKey]     = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async (cat = activeCategory) => {
    try {
      const data = cat
        ? await fetchProvidersByCategory(cat, 50)
        : await fetchFeaturedProviders(50);
      setProviders(data);
    } catch (e) { console.warn('[DISCOVER]', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCategory]);

  useEffect(() => { load(); }, [activeCategory]);

  const sorted = [...providers]
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.commune?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'rating')      return (b.rating || 0) - (a.rating || 0);
      if (sortKey === 'price_asc')   return (a.price || 0) - (b.price || 0);
      if (sortKey === 'price_desc')  return (b.price || 0) - (a.price || 0);
      if (sortKey === 'distance')    return (a.distanceMeters || 999999) - (b.distanceMeters || 999999);
      return 0;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>{sorted.length} expériences</Text>
          <Text style={styles.headerTitle}>{t('tabs.discover')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && { backgroundColor: colors.gold }]}
          onPress={() => { haptic.light(); setShowFilters(v => !v); }}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? colors.bg : colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Prestataire, commune, activité…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter panel */}
      {showFilters && (
        <GlassCard style={styles.filterPanel} noBlur>
          {/* Categories */}
          <Text style={styles.filterLabel}>Catégorie</Text>
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.pill, !activeCategory && styles.pillActive]}
              onPress={() => { haptic.select(); setActiveCategory(null); }}
            >
              <Text style={[styles.pillText, !activeCategory && { color: colors.bg }]}>Tous</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, { borderColor: cat.color + '55' }, active && { backgroundColor: cat.color }]}
                  onPress={() => { haptic.select(); setActiveCategory(active ? null : cat.id); setLoading(true); }}
                >
                  <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.pillText, active && { color: colors.bg }]}>{cat.labelFr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Sort */}
          <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>Trier par</Text>
          <View style={styles.filterPills}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.pill, sortKey === opt.key && styles.pillActive]}
                onPress={() => { haptic.select(); setSortKey(opt.key); }}
              >
                <Text style={[styles.pillText, sortKey === opt.key && { color: colors.bg }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Results */}
      {loading ? (
        <FlatList
          data={[1,2,3,4]}
          keyExtractor={(_, i) => `sk-${i}`}
          renderItem={() => <View style={{ paddingHorizontal: spacing.lg }}><ProviderCardSkeleton /></View>}
          contentContainerStyle={{ paddingTop: spacing.md }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ProviderCard
                provider={item}
                horizontal={false}
                showDistance
                onPress={() => navigation.navigate('ProviderDetail', { provider: item })}
              />
            </View>
          )}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyText}>{t('common.noResults')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerSub: { ...typography.caption, color: colors.textMuted },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.goldBorder,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.bgInput, borderRadius: radius.full,
    paddingHorizontal: spacing.md, height: 46,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },
  filterPanel: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.goldBorder,
  },
  filterLabel: { ...typography.captionBold, color: colors.textMuted, marginBottom: spacing.xs },
  filterPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillEmoji: { fontSize: 13 },
  pillText: { ...typography.captionBold, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
});
