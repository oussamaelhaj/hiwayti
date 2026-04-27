import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../utils/theme';
import { fetchFavorites, toggleFavorite } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ActivityCard from '../components/cards/ActivityCard';
import ProviderCard from '../components/cards/ProviderCard';
import GlassCard from '../components/ui/GlassCard';
import ZelligePattern from '../components/ui/ZelligePattern';
import { haptic } from '../utils/helpers';

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all'); // all, activity, provider

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const favs = await fetchFavorites(user.uid);
      setFavorites(favs);
    } catch (error) {
      console.error('[FAVORITES] Load error:', error);
    }
    setLoading(false);
  };

  const handleToggleFav = async (item) => {
    haptic.select();
    try {
      // Optimistic update
      setFavorites(prev => prev.filter(f => f.id !== item.id));
      await toggleFavorite(user.uid, item.id);
    } catch (error) {
      console.error('[FAVORITES] Toggle error:', error);
      loadFavorites(); // Revert on error
    }
  };

  const filteredFavs = favorites.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'activity') return f.type === 'activity' || f.providerId; // activities usually have providerId
    if (filter === 'provider') return f.type === 'provider' || !f.providerId;
    return true;
  });

  const renderItem = ({ item }) => {
    // Determine if it's an activity or provider
    const isActivity = item.providerId || item.type === 'activity';

    if (isActivity) {
      return (
        <View style={styles.itemContainer}>
          <ActivityCard
            activity={item}
            onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
            onToggleFavorite={() => handleToggleFav(item)}
            isFavorite={true}
          />
        </View>
      );
    }

    return (
      <View style={styles.itemContainer}>
        <ProviderCard
          provider={item}
          onPress={() => navigation.navigate('ProviderDetail', { provider: item })}
        />
      </View>
    );
  };

  const FilterPill = ({ id, label, icon }) => (
    <TouchableOpacity
      style={[styles.filterPill, filter === id && styles.filterPillActive]}
      onPress={() => { haptic.selection(); setFilter(id); }}
    >
      <Ionicons name={icon} size={16} color={filter === id ? colors.bg : colors.textMuted} />
      <Text style={[styles.filterLabel, filter === id && styles.filterLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ZelligePattern opacity={0.03} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Favoris</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterBar}>
        <FilterPill id="all" label="Tous" icon="apps-outline" />
        <FilterPill id="activity" label="Activités" icon="tennisball-outline" />
        <FilterPill id="provider" label="Artisans" icon="color-palette-outline" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={80} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Coup de cœur ?</Text>
          <Text style={styles.emptyText}>Enregistrez vos activités et artisans préférés pour les retrouver ici.</Text>
          <TouchableOpacity 
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.exploreBtnText}>Explorer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFavs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.gold,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.textMuted,
  },
  filterLabelActive: {
    color: colors.bg,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  itemContainer: {
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  exploreBtn: {
    marginTop: 30,
    backgroundColor: colors.gold,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  exploreBtnText: {
    color: colors.bg,
    fontFamily: typography.bold,
    fontSize: 16,
  }
});
