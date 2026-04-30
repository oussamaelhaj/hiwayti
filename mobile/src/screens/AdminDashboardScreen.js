/**
 * AdminDashboardScreen.js — Master Control Center for HIWAYTI
 * Global KPIs, provider approval, user management, and system health
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Dimensions, ActivityIndicator, TouchableOpacity, Alert, FlatList, Image
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow, gradients } from '../utils/theme';
import { haptic, formatPrice, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { 
  fetchPlatformStats, fetchUnverifiedProviders, verifyProvider,
  fetchAllCommunes
} from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import WorldSwitcher from '../components/ui/WorldSwitcher';

const { width } = Dimensions.get('window');

const CHART_CFG = {
  backgroundGradientFrom: colors.bgCard,
  backgroundGradientTo:   colors.bgCard,
  decimalPlaces: 0,
  color: (o = 1) => `rgba(201,168,76,${o})`,
  labelColor: () => colors.textMuted,
  propsForBackgroundLines: { strokeDasharray: '4,4', stroke: 'rgba(255,255,255,0.05)' },
};

export default function AdminDashboardScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    try {
      setLoading(true);
      const [s, up, cm] = await Promise.all([
        fetchPlatformStats(),
        fetchUnverifiedProviders(),
        fetchAllCommunes(10)
      ]);
      setStats(s);
      setUnverified(up);
      setCommunes(cm);
      
      // Fetch a few users for the management tab
      // In a real app, this would be paginated
      // For now, we simulate or fetch if helper exists
    } catch (e) {
      console.warn('[ADMIN]', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id, name) => {
    Alert.alert(
      "Valider Prestataire",
      `Voulez-vous approuver "${name}" sur la plateforme ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Approuver", 
          onPress: async () => {
            try {
              await verifyProvider(id);
              haptic.success();
              load();
            } catch (e) {
              Alert.alert("Erreur", e.message);
            }
          }
        }
      ]
    );
  };

  if (loading && !stats) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <WorldSwitcher />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.headerSub}>HIWAYTI COMMAND CENTER</Text>
          <Text style={styles.headerTitle}>Administration</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Image source={{ uri: userProfile?.avatarUrl || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {[
            { id: 'overview', label: 'Dashboard', icon: 'apps' },
            { id: 'approvals', label: 'Validations', icon: 'checkmark-shield', badge: unverified.length },
            { id: 'communes', label: 'Villes', icon: 'map' },
            { id: 'users', label: 'Utilisateurs', icon: 'people' },
          ].map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              onPress={() => { haptic.select(); setActiveTab(tab.id); }}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? colors.bg : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'Prestataires', value: stats?.providers || 0, icon: 'business', color: colors.gold, trend: '+12%' },
                { label: 'Réservations', value: stats?.bookings || 0, icon: 'calendar', color: colors.accent, trend: '+5%' },
                { label: 'Activités', value: stats?.activities || 0, icon: 'flash', color: colors.info, trend: '+8%' },
                { label: 'CA Global', value: '14.2k', icon: 'wallet', color: colors.success, trend: '+22%' },
              ].map((kpi, i) => (
                <GlassCard key={i} style={styles.kpiCard} goldBorder={i===0}>
                  <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '22' }]}>
                    <Ionicons name={kpi.icon} size={20} color={kpi.color} />
                  </View>
                  <Text style={styles.kpiVal}>{kpi.value}</Text>
                  <Text style={styles.kpiLab}>{kpi.label}</Text>
                  <Text style={[styles.kpiTrend, { color: colors.success }]}>{kpi.trend}</Text>
                </GlassCard>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Volume de Transactions</Text>
            <GlassCard style={styles.chartWrap}>
              <LineChart
                data={{
                  labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"],
                  datasets: [{ data: [2100, 4500, 3200, 8000, 9900, 14300] }]
                }}
                width={width - 64}
                height={180}
                chartConfig={{
                  ...CHART_CFG,
                  color: (o=1) => `rgba(29, 214, 195, ${o})`,
                }}
                bezier
                style={{ borderRadius: 16 }}
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Répartition par Secteur</Text>
            <GlassCard style={styles.chartWrap}>
              <PieChart
                data={[
                  { name: 'Sports', population: 40, color: colors.padel, legendFontColor: colors.textSecondary },
                  { name: 'Artisanat', population: 35, color: colors.gold, legendFontColor: colors.textSecondary },
                  { name: 'Nature', population: 15, color: colors.hiking, legendFontColor: colors.textSecondary },
                  { name: 'Autre', population: 10, color: colors.textMuted, legendFontColor: colors.textSecondary },
                ]}
                width={width - 64}
                height={160}
                chartConfig={CHART_CFG}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </GlassCard>
          </>
        )}

        {activeTab === 'approvals' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Demandes en attente</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{unverified.length}</Text></View>
            </View>
            
            {unverified.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyText}>Tout est à jour ! Aucune validation en attente.</Text>
              </View>
            ) : unverified.map(item => (
              <GlassCard key={item.id} style={styles.approvalCard} goldBorder>
                <View style={styles.approvalInfo}>
                  <View style={styles.approvalHeader}>
                    <Text style={styles.approvalName}>{item.name}</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>NOUVEAU</Text>
                    </View>
                  </View>
                  <Text style={styles.approvalMeta}>
                    <Ionicons name="pricetag" size={10} /> {item.category} • <Ionicons name="location" size={10} /> {item.commune || 'Maroc'}
                  </Text>
                  <Text style={styles.approvalDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.approveBtn}
                  onPress={() => handleVerify(item.id, item.name)}
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.bg} />
                </TouchableOpacity>
              </GlassCard>
            ))}
          </>
        )}

        {activeTab === 'communes' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gestion des Territoires</Text>
              <TouchableOpacity onPress={() => haptic.light()}><Ionicons name="add-circle" size={24} color={colors.gold} /></TouchableOpacity>
            </View>
            <View style={styles.communeGrid}>
              {communes.map(c => (
                <TouchableOpacity key={c.id} style={styles.communeItem} activeOpacity={0.9}>
                  <Image source={{ uri: c.coverImage || 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=200' }} style={styles.communeImg} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                  <Text style={styles.communeName}>{c.name}</Text>
                  <View style={styles.communeStat}>
                    <Text style={styles.communeStatText}>{Math.floor(Math.random()*50)} acts</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {activeTab === 'users' && (
          <>
            <Text style={styles.sectionTitle}>Utilisateurs Récents</Text>
            {[
              { id: 1, name: 'Amine R.', email: 'amine@hiwayti.ma', role: 'voyageur', img: 'https://i.pravatar.cc/150?u=1' },
              { id: 2, name: 'Zineb K.', email: 'zineb@host.ma', role: 'prestataire', img: 'https://i.pravatar.cc/150?u=2' },
              { id: 3, name: 'Karim L.', email: 'karim@gmail.com', role: 'voyageur', img: 'https://i.pravatar.cc/150?u=3' },
            ].map(u => (
              <GlassCard key={u.id} style={styles.userCard}>
                <Image source={{ uri: u.img }} style={styles.userAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: u.role === 'prestataire' ? colors.gold + '22' : colors.accent + '22' }]}>
                  <Text style={[styles.roleText, { color: u.role === 'prestataire' ? colors.gold : colors.accent }]}>
                    {u.role}
                  </Text>
                </View>
              </GlassCard>
            ))}
            <AppButton title="Voir tous les utilisateurs" variant="outline" style={{ marginTop: 10 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerSub: { ...typography.caption, color: colors.goldLight, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },
  headerTitle: { ...typography.h1, color: colors.textPrimary, fontSize: 28 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.goldBorder },
  avatar: { width: '100%', height: '100%' },
  
  tabBarContainer: { marginBottom: 10 },
  tabRow: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: 5 },
  tab: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, 
    borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { ...typography.captionBold, color: colors.textMuted },
  tabTextActive: { color: colors.bg },
  badge: { backgroundColor: colors.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 20 },
  kpiCard: { 
    width: (width - 64 - 10) / 2,
    padding: 15, 
    gap: 4 
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  kpiVal: { ...typography.h2, color: colors.textPrimary, fontSize: 22 },
  kpiLab: { ...typography.caption, color: colors.textMuted },
  kpiTrend: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 15 },
  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginVertical: 0 },
  countBadge: { backgroundColor: colors.gold + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { color: colors.gold, fontSize: 12, fontWeight: 'bold' },

  chartWrap: { padding: 15, alignItems: 'center', marginBottom: 10 },
  
  approvalCard: { padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 15 },
  approvalInfo: { flex: 1 },
  approvalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  approvalName: { ...typography.h4, color: colors.textPrimary },
  pendingBadge: { backgroundColor: colors.success + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingBadgeText: { color: colors.success, fontSize: 8, fontWeight: 'bold' },
  approvalMeta: { ...typography.caption, color: colors.gold, marginBottom: 4 },
  approvalDesc: { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
  approveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },

  communeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  communeItem: { width: (width - 64 - 10) / 2, height: 130, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.bgCard, elevation: 5 },
  communeImg: { width: '100%', height: '100%' },
  communeName: { position: 'absolute', bottom: 25, left: 12, ...typography.h4, color: '#fff', fontSize: 16 },
  communeStat: { position: 'absolute', bottom: 8, left: 12 },
  communeStatText: { ...typography.caption, color: colors.goldLight, fontWeight: 'bold' },

  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10, gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard },
  userName: { ...typography.bodyMd, color: colors.textPrimary, fontWeight: 'bold' },
  userEmail: { ...typography.caption, color: colors.textMuted },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText: { ...typography.tag, fontSize: 9 },

  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});

