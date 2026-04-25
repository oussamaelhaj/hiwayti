/**
 * ProviderDashboardScreen.js — HIWAYTI Provider/Artisan Dashboard
 * Bookings, revenue, analytics, reviews, profile management
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow, gradients } from '../utils/theme';
import { haptic, formatPrice, getBookingStatusColor, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import {
  fetchProviderBookings, fetchReviews, updateBookingStatus,
} from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';
import StarRating from '../components/ui/StarRating';

const { width } = Dimensions.get('window');

export default function ProviderDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const providerId = userProfile?.providerId || user?.uid;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchProviderBookings(providerId),
      fetchReviews(providerId, 10),
    ]).then(([b, r]) => {
      setBookings(b);
      setReviews(r);
    }).catch(console.warn).finally(() => setLoading(false));
  }, [user, providerId]);

  // ── Computed stats ──
  const totalRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + (b.totalPrice || 0), 0);
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const avgRating      = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  // ── Revenue chart data (last 7 months mock) ──
  const revenueData = {
    labels: ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'],
    datasets: [{ data: [2400, 3100, 2800, 4200, 3600, 4800, totalRevenue > 0 ? totalRevenue : 5200] }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(201,168,76,${opacity})`,
    labelColor: () => colors.textMuted,
    style: { borderRadius: radius.md },
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: 'rgba(255,255,255,0.05)' },
  };

  const TABS = ['overview', 'bookings', 'reviews', 'analytics'];

  const handleStatusUpdate = async (bookingId, status) => {
    haptic.medium();
    try {
      await updateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      haptic.success();
    } catch (e) {
      haptic.error();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Tableau de Bord</Text>
          <Text style={styles.headerTitle}>{userProfile?.name || user?.displayName || 'Mon Espace'}</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { haptic.select(); setActiveTab(tab); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Vue d\'ensemble'
                : tab === 'bookings' ? t('dashboard.bookings')
                : tab === 'reviews'  ? t('dashboard.reviews')
                : t('dashboard.analytics')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              {[
                { label: t('dashboard.monthRevenue'), value: formatPrice(totalRevenue), icon: 'cash-outline', color: colors.gold },
                { label: t('dashboard.todayBookings'), value: `${pendingCount + confirmedCount}`, icon: 'calendar-outline', color: colors.accent },
                { label: t('dashboard.avgRating'), value: avgRating.toFixed(1) + ' ⭐', icon: 'star-outline', color: colors.goldLight },
                { label: t('dashboard.totalClients'), value: `${bookings.length}`, icon: 'people-outline', color: colors.success },
              ].map((kpi, i) => (
                <GlassCard key={i} style={styles.kpiCard} goldBorder={i === 0}>
                  <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '22' }]}>
                    <Ionicons name={kpi.icon} size={20} color={kpi.color} />
                  </View>
                  <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                </GlassCard>
              ))}
            </View>

            {/* Pending actions */}
            {pendingCount > 0 && (
              <GlassCard style={styles.alertCard} goldBorder>
                <Ionicons name="notifications" size={18} color={colors.warning} />
                <Text style={styles.alertText}>
                  {pendingCount} réservation{pendingCount > 1 ? 's' : ''} en attente de confirmation
                </Text>
                <TouchableOpacity onPress={() => setActiveTab('bookings')}>
                  <Text style={styles.alertAction}>Voir →</Text>
                </TouchableOpacity>
              </GlassCard>
            )}

            {/* Revenue chart */}
            <Text style={styles.sectionTitle}>Revenus (7 mois)</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <BarChart
                data={revenueData}
                width={width - spacing.lg * 2 - 2}
                height={180}
                chartConfig={chartConfig}
                style={{ borderRadius: radius.md }}
                withInnerLines
                showValuesOnTopOfBars={false}
                fromZero
              />
            </GlassCard>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.actionsGrid}>
              {[
                { label: 'Modifier le profil', icon: 'person-outline', screen: 'EditProfile' },
                { label: 'Ajouter un produit', icon: 'add-circle-outline', screen: 'AddProduct' },
                { label: 'Voir les avis', icon: 'star-outline', action: () => setActiveTab('reviews') },
                { label: 'Analytiques', icon: 'bar-chart-outline', action: () => setActiveTab('analytics') },
              ].map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.actionCard}
                  onPress={() => { haptic.light(); a.action ? a.action() : navigation.navigate(a.screen); }}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name={a.icon} size={22} color={colors.gold} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── BOOKINGS ── */}
        {activeTab === 'bookings' && (
          <>
            <Text style={styles.sectionTitle}>Réservations ({bookings.length})</Text>
            {bookings.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40 }}>📅</Text>
                <Text style={styles.emptyText}>Aucune réservation pour l'instant</Text>
              </View>
            ) : bookings.map(b => (
              <GlassCard key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.bookingClient}>{b.clientName || 'Client'}</Text>
                    <Text style={styles.bookingDate}>{formatDate(b.date)} • {b.time}</Text>
                    <Text style={styles.bookingParticipants}>{b.participants} participant{b.participants > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <Text style={styles.bookingPrice}>{formatPrice(b.totalPrice)}</Text>
                    <View style={[styles.bookingBadge, { backgroundColor: getBookingStatusColor(b.status) + '22' }]}>
                      <Text style={[styles.bookingStatus, { color: getBookingStatusColor(b.status) }]}>
                        {b.status === 'pending' ? 'En attente'
                          : b.status === 'confirmed' ? 'Confirmé'
                          : b.status === 'completed' ? 'Terminé' : 'Annulé'}
                      </Text>
                    </View>
                  </View>
                </View>

                {b.status === 'pending' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleStatusUpdate(b.id, 'confirmed')}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.bg} />
                      <Text style={styles.acceptText}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleStatusUpdate(b.id, 'cancelled')}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                      <Text style={styles.rejectText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            ))}
          </>
        )}

        {/* ── REVIEWS ── */}
        {activeTab === 'reviews' && (
          <>
            <View style={styles.ratingOverview}>
              <Text style={styles.avgRatingBig}>{avgRating.toFixed(1)}</Text>
              <StarRating rating={avgRating} size={24} />
              <Text style={styles.reviewCount}>{reviews.length} avis</Text>
            </View>
            {reviews.map(r => (
              <GlassCard key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{(r.userName || 'A').charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{r.userName || 'Anonyme'}</Text>
                    <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
                  </View>
                  <StarRating rating={r.rating} size={14} />
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </GlassCard>
            ))}
          </>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <>
            <Text style={styles.sectionTitle}>Courbe de Réservations</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <LineChart
                data={{
                  labels: ['J', 'F', 'M', 'A', 'M', 'J', 'A'],
                  datasets: [{ data: [5, 8, 12, 9, 15, 20, bookings.length || 18] }],
                }}
                width={width - spacing.lg * 2 - 2}
                height={180}
                chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(29,214,195,${o})` }}
                bezier
                style={{ borderRadius: radius.md }}
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Indicateurs Clés</Text>
            {[
              { label: 'Taux de confirmation', value: bookings.length ? Math.round((confirmedCount / bookings.length) * 100) + '%' : '—', color: colors.success },
              { label: 'Revenu total', value: formatPrice(totalRevenue), color: colors.gold },
              { label: 'Réservations totales', value: bookings.length.toString(), color: colors.accent },
              { label: 'Note moyenne', value: avgRating.toFixed(1) + '/5', color: colors.goldLight },
            ].map((kpi, i) => (
              <GlassCard key={i} style={styles.kpiRow}>
                <Text style={styles.kpiRowLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiRowValue, { color: kpi.color }]}>{kpi.value}</Text>
              </GlassCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  headerSub: { ...typography.caption, color: colors.textMuted },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  settingsBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  tab: {
    paddingVertical: 8, paddingHorizontal: spacing.lg,
    borderRadius: radius.full, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: colors.gold },
  tabText: { ...typography.captionBold, color: colors.textMuted },
  tabTextActive: { color: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.sm },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    padding: spacing.md, gap: spacing.xs,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...typography.h2, fontWeight: '800' },
  kpiLabel: { ...typography.caption, color: colors.textMuted },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  alertText: { ...typography.bodyMd, color: colors.textPrimary, flex: 1 },
  alertAction: { ...typography.bodyMd, color: colors.gold, fontWeight: '700' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'flex-start',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { ...typography.bodyMd, color: colors.textPrimary },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },

  bookingCard: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  bookingClient: { ...typography.h4, color: colors.textPrimary },
  bookingDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  bookingParticipants: { ...typography.caption, color: colors.textMuted },
  bookingRight: { alignItems: 'flex-end', gap: spacing.xs },
  bookingPrice: { ...typography.h4, color: colors.gold },
  bookingBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full },
  bookingStatus: { ...typography.captionBold },
  bookingActions: { flexDirection: 'row', gap: spacing.sm },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  acceptText: { ...typography.bodyMd, color: colors.bg, fontWeight: '700' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.danger + '44',
  },
  rejectText: { ...typography.bodyMd, color: colors.danger },

  ratingOverview: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  avgRatingBig: { ...typography.display, color: colors.gold },
  reviewCount: { ...typography.body, color: colors.textMuted },

  reviewCard: { padding: spacing.md, marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { ...typography.h4, color: colors.gold },
  reviewerName: { ...typography.bodyMd, color: colors.textPrimary },
  reviewDate: { ...typography.caption, color: colors.textMuted },
  reviewComment: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  kpiRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  kpiRowLabel: { ...typography.body, color: colors.textSecondary },
  kpiRowValue: { ...typography.h4, fontWeight: '800' },
});
