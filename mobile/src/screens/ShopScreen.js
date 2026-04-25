/**
 * ShopScreen.js — HIWAYTI Artisanat Marketplace Shop
 * Product grid with categories, favorites, and search
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { fetchProducts, toggleFavorite } from '../services/api';
import ProductCard from '../components/cards/ProductCard';
import { ProductCardSkeleton } from '../components/ui/SkeletonLoader';

const SHOP_CATEGORIES = CATEGORIES.filter(c => ['pottery', 'leather', 'textiles', 'cuisine', 'music'].includes(c.id));

export default function ShopScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(new Set(
    (userProfile?.favorites || []).filter(f => f.startsWith('product:')).map(f => f.replace('product:', ''))
  ));

  const loadProducts = useCallback(async (cat = activeCategory) => {
    try {
      const data = await fetchProducts(cat, 40);
      setProducts(data);
    } catch (e) { console.warn('[SHOP]', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCategory]);

  useEffect(() => { loadProducts(); }, [activeCategory]);

  const onRefresh = () => { setRefreshing(true); haptic.light(); loadProducts(); };

  const handleFavorite = async (productId) => {
    if (!user) return;
    haptic.select();
    const isFav = favorites.has(productId);
    setFavorites(prev => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });
    try { await toggleFavorite(user.uid, productId, 'product'); }
    catch (e) { console.warn('[SHOP] Fav error:', e.message); }
  };

  const filtered = products.filter(p => {
    if (!search) return true;
    return p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.artisanName?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Marché Artisanat</Text>
          <Text style={styles.headerTitle}>{t('shop.title')}</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="bag-outline" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('shop.searchProducts')}
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

      {/* Category pills */}
      <FlatList
        data={[{ id: null, emoji: '🌐', labelFr: 'Tous', color: colors.gold }, ...SHOP_CATEGORIES]}
        horizontal
        keyExtractor={(_, i) => `scat-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
        renderItem={({ item }) => {
          const active = activeCategory === item.id;
          return (
            <TouchableOpacity
              style={[styles.catPill, { borderColor: item.color + '40' }, active && { backgroundColor: item.color }]}
              onPress={() => { haptic.select(); setActiveCategory(item.id); setLoading(true); }}
            >
              <Text style={styles.catEmoji}>{item.emoji}</Text>
              <Text style={[styles.catText, active && { color: colors.bg }]}>{item.labelFr}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{filtered.length} produits</Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Ionicons name="options-outline" size={16} color={colors.gold} />
          <Text style={styles.sortText}>Trier</Text>
        </TouchableOpacity>
      </View>

      {/* Product grid */}
      {loading ? (
        <FlatList
          data={[1,2,3,4,5,6]}
          numColumns={2}
          keyExtractor={(_, i) => `sk-${i}`}
          renderItem={() => <ProductCardSkeleton />}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isFavorite={favorites.has(item.id)}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
              onFavorite={() => handleFavorite(item.id)}
            />
          )}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🏺</Text>
              <Text style={styles.emptyText}>Aucun produit trouvé</Text>
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
  cartBtn: {
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
  catScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catText: { ...typography.captionBold, color: colors.textSecondary },
  resultsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  resultsText: { ...typography.caption, color: colors.textMuted },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { ...typography.captionBold, color: colors.gold },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  empty: { flex: 1, alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
});
