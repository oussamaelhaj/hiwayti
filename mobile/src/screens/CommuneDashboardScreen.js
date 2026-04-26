/**
 * CommuneDashboardScreen.js — Municipal Dashboard for Commune Partners
 * Provider activity, economic impact, heatmaps, KPIs
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Dimensions, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic, formatPrice } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { fetchCommuneStats, fetchUnverifiedProviders, verifyProvider, cleanupCommuneData } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';

const { width } = Dimensions.get('window');

const CHART_CFG = {
  backgroundGradientFrom: colors.bgCard,
  backgroundGradientTo:   colors.bgCard,
  decimalPlaces: 0,
  color: (o = 1) => `rgba(201,168,76,${o})`,
  labelColor: () => colors.textMuted,
  propsForBackgroundLines: { strokeDasharray: '4,4', stroke: 'rgba(255,255,255,0.05)' },
};

export default function CommuneDashboardScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { userRole, userProfile } = useAuth();
  const communeId = route?.params?.communeId || userProfile?.communeId || 'demo';
  const communeName = userRole === 'admin' ? 'Administration HIWAYTI' : (route?.params?.communeName || userProfile?.communeName || 'Ma Commune');

  const [stats, setStats] = useState(null);
  const [unverifiedProviders, setUnverifiedProviders] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const s = await fetchCommuneStats(communeId);
      setStats(s);
      if (userRole === 'admin') {
        const up = await fetchUnverifiedProviders();
        setUnverifiedProviders(up);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = () => {
    Alert.alert(
      "Nettoyage du système",
      "Voulez-vous vraiment supprimer toutes les données de test (prestataires non vérifiés et réservations fictives) ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await cleanupCommuneData(communeId);
              Alert.alert("Succès", "Les données de test ont été nettoyées.");
              load();
            } catch (e) {
              Alert.alert("Erreur", "Le nettoyage a échoué. Vérifiez votre connexion au backend.");
              console.warn(e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    load();
  }, [communeId, userRole]);

  const monthlyData = {
    labels: ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'],
    datasets: [{ data: [38000, 45000, 52000, 48000, 61000, 72000, 85000] }],
  };

  const satisfactionData = {
    labels: ['J', 'F', 'M', 'A', 'M', 'J', 'A'],
    datasets: [{ data: [82, 85, 88, 84, 90, 92, 94] }],
  };

  const categoryDistrib = CATEGORIES.slice(0, 5).map((cat, i) => ({
    name: cat.labelFr,
    population: [30, 25, 20, 15, 10][i],
    color: Object.values(colors).filter(c => typeof c === 'string' && c.startsWith('#'))[i + 5] || colors.gold,
    legendFontColor: colors.textMuted,
    legendFontSize: 11,
  }));

  const TABS = userRole === 'admin' 
    ? ['overview', 'validations', 'economic', 'providers', 'satisfaction', 'system'] 
    : ['overview', 'economic', 'providers', 'satisfaction'];

  const handleVerify = async (providerId) => {
    try {
      await verifyProvider(providerId);
      setUnverifiedProviders(prev => prev.filter(p => p.id !== providerId));
      haptic.success();
    } catch (e) {
      console.warn(e);
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
      {/* Header with gradient */}
      <LinearGradient colors={['#0a0500', '#06060e']} style={styles.headerGradient}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerSub}>{t('commune.title')}</Text>
            <Text style={styles.headerTitle}>{communeName}</Text>
          </View>
          <View style={styles.communeBadge}>
            <Ionicons name="business" size={20} color={colors.gold} />
          </View>
        </View>

        {/* Top KPIs */}
        <View style={styles.topKpis}>
          {[
            { label: t('commune.activeProviders'), value: stats?.activeProviders || 0, icon: 'business-outline', color: colors.gold },
            { label: t('commune.economicImpact'),  value: formatPrice(stats?.totalRevenue || 0), icon: 'trending-up-outline', color: colors.success },
            { label: t('commune.touristSatisfaction'), value: stats?.satisfaction || '—', icon: 'heart-outline', color: colors.accent },
          ].map((kpi, i) => (
            <View key={i} style={styles.topKpi}>
              <Ionicons name={kpi.icon} size={16} color={kpi.color} />
              <Text style={[styles.topKpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={styles.topKpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

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
                : tab === 'validations' ? `Validations (${unverifiedProviders.length})`
                : tab === 'economic'  ? 'Impact Économique'
                : tab === 'providers' ? 'Prestataires'
                : tab === 'system' ? 'Système'
                : 'Satisfaction'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── VALIDATIONS ── */}
        {activeTab === 'validations' && (
          <View>
            <Text style={styles.sectionTitle}>En attente de validation</Text>
            {unverifiedProviders.length === 0 ? (
              <GlassCard style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ ...typography.body, color: colors.textMuted }}>Aucun prestataire en attente.</Text>
              </GlassCard>
            ) : (
              unverifiedProviders.map(p => (
                <GlassCard key={p.id} style={{ padding: spacing.md, marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.h4, color: colors.textPrimary, marginBottom: 4 }}>{p.name}</Text>
                      <Text style={{ ...typography.caption, color: colors.gold, marginBottom: 8 }}>{CATEGORIES.find(c => c.id === p.category)?.labelFr || p.category} • {p.communeId}</Text>
                      <Text style={{ ...typography.body, color: colors.textSecondary }}>{p.description}</Text>
                    </View>
                  </View>
                  <GoldButton title="Valider le profil" onPress={() => handleVerify(p.id)} style={{ marginTop: spacing.md }} />
                </GlassCard>
              ))
            )}
          </View>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'Réservations totales', value: stats?.totalBookings || '0', icon: 'calendar-outline', color: colors.gold },
                { label: 'Prestataires actifs', value: stats?.activeProviders || '0', icon: 'business-outline', color: colors.accent },
                { label: 'Revenu mensuel', value: '85k MAD', icon: 'cash-outline', color: colors.success },
                { label: 'Note communale', value: '4.6/5', icon: 'star-outline', color: colors.goldLight },
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

            <Text style={styles.sectionTitle}>Catégories Populaires</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <PieChart
                data={categoryDistrib}
                width={width - spacing.lg * 2 - 2}
                height={160}
                chartConfig={CHART_CFG}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="12"
                hasLegend
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Réservations récentes</Text>
            {[
              { name: 'Ahmed Benali', activity: 'Surf — Asilah', time: 'Il y a 2h', amount: 350 },
              { name: 'Marie Dupont', activity: 'Poterie — Fès', time: 'Il y a 4h', amount: 200 },
              { name: 'Youssef El-Mansouri', activity: 'Randonnée — Atlas', time: 'Il y a 5h', amount: 450 },
            ].map((item, i) => (
              <GlassCard key={i} style={styles.activityRow}>
                <View style={styles.activityAvatar}>
                  <Text style={styles.activityAvatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityName}>{item.name}</Text>
                  <Text style={styles.activityDesc}>{item.activity}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.activityAmount}>{formatPrice(item.amount)}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        {/* ── ECONOMIC IMPACT ── */}
        {activeTab === 'economic' && (
          <>
            <Text style={styles.sectionTitle}>Revenus Mensuels (MAD)</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <BarChart
                data={monthlyData}
                width={width - spacing.lg * 2 - 2}
                height={200}
                chartConfig={CHART_CFG}
                style={{ borderRadius: radius.md }}
                withInnerLines fromZero
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Impact Économique</Text>
            {[
              { label: 'Revenu total généré', value: formatPrice(481000), trend: '+18%', positive: true },
              { label: 'Emplois soutenus', value: '127 emplois', trend: '+8%', positive: true },
              { label: 'Touristes accueillis', value: '2 340', trend: '+22%', positive: true },
              { label: 'PIB local estimé', value: formatPrice(1200000), trend: '+12%', positive: true },
            ].map((row, i) => (
              <GlassCard key={i} style={styles.impactRow}>
                <Text style={styles.impactLabel}>{row.label}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.impactValue}>{row.value}</Text>
                  <Text style={[styles.impactTrend, { color: row.positive ? colors.success : colors.danger }]}>
                    {row.trend}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        {/* ── PROVIDERS ── */}
        {activeTab === 'providers' && (
          <>
            <Text style={styles.sectionTitle}>Prestataires par catégorie</Text>
            {CATEGORIES.map(cat => {
              const count = Math.floor(Math.random() * 20) + 2;
              return (
                <GlassCard key={cat.id} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.labelFr}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${(count / 22) * 100}%`, backgroundColor: colors[cat.id] || colors.gold }]} />
                    </View>
                  </View>
                  <Text style={[styles.catCount, { color: colors[cat.id] || colors.gold }]}>{count}</Text>
                </GlassCard>
              );
            })}
          </>
        )}

        {/* ── SATISFACTION ── */}
        {activeTab === 'satisfaction' && (
          <>
            <Text style={styles.sectionTitle}>Satisfaction Touristique (%)</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <LineChart
                data={satisfactionData}
                width={width - spacing.lg * 2 - 2}
                height={200}
                chartConfig={{ ...CHART_CFG, color: (o = 1) => `rgba(29,214,195,${o})` }}
                bezier style={{ borderRadius: radius.md }}
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Indicateurs de Satisfaction</Text>
            {[
              { label: 'Note globale', value: '4.6 / 5', sub: 'Basé sur 847 avis', color: colors.gold },
              { label: 'Taux de retour', value: '68%', sub: 'Touristes revenus plusieurs fois', color: colors.success },
              { label: 'Recommandation', value: '91%', sub: 'Recommanderaient la destination', color: colors.accent },
              { label: 'Satisfaction artisanat', value: '4.8 / 5', sub: 'Qualité produits évaluée', color: colors.goldLight },
            ].map((s, i) => (
              <GlassCard key={i} style={styles.satCard}>
                <View>
                  <Text style={styles.satLabel}>{s.label}</Text>
                  <Text style={styles.satSub}>{s.sub}</Text>
                </View>
                <Text style={[styles.satValue, { color: s.color }]}>{s.value}</Text>
              </GlassCard>
            ))}
          </>
        )}

        {/* ── SYSTEM ── */}
        {activeTab === 'system' && (
          <View style={{ paddingBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>Gestion du Système</Text>
            <GlassCard style={{ padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.danger + '22' }]}>
                  <Ionicons name="trash-outline" size={24} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiValue}>Réinitialisation</Text>
                  <Text style={styles.topKpiLabel}>Supprime les prestataires non vérifiés et les réservations de test.</Text>
                </View>
              </View>
              <GoldButton
                title="Nettoyer les données de test"
                onPress={() => {
                  Alert.alert(
                    'Attention',
                    'Voulez-vous vraiment supprimer toutes les données de test (prestataires non vérifiés et réservations) ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Confirmer', style: 'destructive', onPress: async () => {
                        try {
                          await cleanupCommuneData(communeId);
                          Alert.alert('Succès', 'Données nettoyées');
                          load();
                        } catch (e) {
                          Alert.alert('Erreur', e.message);
                        }
                      }}
                    ]
                  );
                }}
                style={{ backgroundColor: colors.danger + '22', borderColor: colors.danger + '44' }}
              />
            </GlassCard>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Paramètres de la Commune</Text>
              <GlassCard style={{ padding: spacing.md }}>
                <Text style={styles.topKpiLabel}>ID de la commune: {communeId}</Text>
                <Text style={styles.topKpiLabel}>Région: Souss-Massa</Text>
              </GlassCard>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerGradient: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  headerInner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  headerSub: { ...typography.caption, color: colors.textMuted },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  communeBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.goldGlow, borderWidth: 1.5, borderColor: colors.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  topKpis: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md },
  topKpi: { flex: 1, alignItems: 'center', gap: 4 },
  topKpiValue: { ...typography.h3, fontWeight: '800' },
  topKpiLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  tabScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm, paddingTop: spacing.sm },
  tab: {
    paddingVertical: 8, paddingHorizontal: spacing.lg,
    borderRadius: radius.full, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: colors.gold },
  tabText: { ...typography.captionBold, color: colors.textMuted },
  tabTextActive: { color: colors.bg },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.md },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: { width: (width - spacing.lg * 2 - spacing.sm) / 2, padding: spacing.md, gap: spacing.xs },
  kpiIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...typography.h2, fontWeight: '800' },
  kpiLabel: { ...typography.caption, color: colors.textMuted },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  activityAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center',
  },
  activityAvatarText: { ...typography.h4, color: colors.gold },
  activityName: { ...typography.bodyMd, color: colors.textPrimary },
  activityDesc: { ...typography.caption, color: colors.textMuted },
  activityAmount: { ...typography.bodyMd, color: colors.gold, fontWeight: '700' },
  activityTime: { ...typography.caption, color: colors.textMuted },

  impactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  impactLabel: { ...typography.body, color: colors.textSecondary },
  impactValue: { ...typography.h4, color: colors.textPrimary },
  impactTrend: { ...typography.captionBold },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  catEmoji: { fontSize: 22 },
  catName: { ...typography.bodyMd, color: colors.textPrimary, marginBottom: 4 },
  progressBar: { height: 4, backgroundColor: colors.bgElevated, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  catCount: { ...typography.h4, fontWeight: '800', minWidth: 30, textAlign: 'right' },

  satCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  satLabel: { ...typography.bodyMd, color: colors.textPrimary },
  satSub: { ...typography.caption, color: colors.textMuted },
  satValue: { ...typography.h3, fontWeight: '800' },
});
