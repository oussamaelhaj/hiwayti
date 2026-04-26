/**
 * ProviderDashboardScreen.js v2 — HIWAYTI Provider Dashboard
 * Real analytics, activity management, real-time bookings
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Dimensions, ActivityIndicator, TextInput, Alert, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic, formatPrice, getBookingStatusColor, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import {
  fetchProviderBookings, fetchReviews, updateBookingStatus,
  fetchProviderActivities, fetchProviderAnalytics, uploadImage
} from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';
import StarRating from '../components/ui/StarRating';

const { width } = Dimensions.get('window');
const TABS = ['overview', 'bookings', 'activities', 'reviews', 'profile'];

export default function ProviderDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();

  const [bookings, setBookings]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('overview');

  const isSetupComplete = userProfile?.providerSetupComplete === true;
  const [setupForm, setSetupForm] = useState({ name: '', category: CATEGORIES[0].id, commune: 'c1', desc: '' });
  const [setupLoading, setSetupLoading] = useState(false);

  const handleSetupSubmit = async () => {
    if (!setupForm.name || !setupForm.desc) return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
    setSetupLoading(true);
    try {
      const newId = user.uid;
      await setDoc(doc(db, 'providers', newId), {
        name: setupForm.name,
        category: setupForm.category,
        communeId: setupForm.commune,
        description: setupForm.desc,
        ownerId: user.uid,
        verified: false,
        rating: 0,
        reviews: 0,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        providerId: newId,
        providerSetupComplete: true
      });
      haptic.success();
      Alert.alert('Succès', 'Profil soumis avec succès. En attente de validation par l\'administration.');
      // userProfile in AuthContext will update on next fetch or restart, 
      // but we can locally force loading or let the user refresh.
    } catch (e) {
      haptic.error();
      Alert.alert('Erreur', e.message);
    }
    setSetupLoading(false);
  };

  const [providerProfile, setProviderProfile] = useState(null);

  const providerId = userProfile?.providerId || user?.uid;

  const [editProfile, setEditProfile] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (providerProfile) {
      setEditProfile({
        name: providerProfile.name || '',
        description: providerProfile.description || '',
        imageUrl: providerProfile.imageUrl || null,
        coverUrl: providerProfile.coverUrl || null,
      });
    }
  }, [providerProfile]);

  const pickProfileImage = async (field) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'coverUrl' ? [16, 9] : [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditProfile(p => ({ ...p, [field]: result.assets[0].uri }));
    }
  };

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      let finalImg = editProfile.imageUrl;
      let finalCover = editProfile.coverUrl;

      if (editProfile.imageUrl && editProfile.imageUrl.startsWith('file://')) {
        finalImg = await uploadImage(editProfile.imageUrl, `providers/${providerId}/logo`);
      }
      if (editProfile.coverUrl && editProfile.coverUrl.startsWith('file://')) {
        finalCover = await uploadImage(editProfile.coverUrl, `providers/${providerId}/cover`);
      }

      await updateDoc(doc(db, 'providers', providerId), {
        name: editProfile.name,
        description: editProfile.description,
        imageUrl: finalImg,
        coverUrl: finalCover,
        updatedAt: serverTimestamp()
      });
      haptic.success();
      Alert.alert('Succès', 'Profil mis à jour');
      load();
    } catch (e) {
      haptic.error();
      Alert.alert('Erreur', e.message);
    }
    setUpdatingProfile(false);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, r, acts, an, pSnap] = await Promise.all([
        fetchProviderBookings(providerId),
        fetchReviews(providerId, 20),
        fetchProviderActivities(providerId),
        fetchProviderAnalytics(providerId),
        getDoc(doc(db, 'providers', providerId))
      ]);
      setBookings(b);
      setReviews(r);
      setActivities(acts);
      if (pSnap.exists()) setProviderProfile(pSnap.data());
      setAnalytics(an);
    } catch (e) { console.warn(e); }
    setLoading(false);
  }, [user, providerId]);

  useEffect(() => { load(); }, [load]);

  // ── Computed KPIs ──
  const totalRevenue   = analytics?.totalRevenue ?? bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.totalPrice || 0), 0);
  const pendingCount   = analytics?.pendingBookings   ?? bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = analytics?.confirmedBookings ?? bookings.filter(b => b.status === 'confirmed').length;
  const avgRating      = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
  const activeActs     = activities.filter(a => a.active !== false).length;
  const convRate       = analytics?.conversionRate ?? (bookings.length ? Math.round(((analytics?.completedBookings ?? 0) / bookings.length) * 100) : 0);

  // ── Chart data ──
  const monthlyData = analytics?.monthlyData || [
    { label: 'Oct', revenue: 2400 }, { label: 'Nov', revenue: 3100 },
    { label: 'Déc', revenue: 2800 }, { label: 'Jan', revenue: 4200 },
    { label: 'Fév', revenue: 3600 }, { label: 'Mar', revenue: 4800 },
    { label: 'Avr', revenue: totalRevenue > 0 ? totalRevenue : 5200 },
  ];

  const revenueChart = {
    labels: monthlyData.map(m => m.label),
    datasets: [{ data: monthlyData.map(m => m.revenue || 0) }],
  };

  const bookingChart = {
    labels: monthlyData.map(m => m.label),
    datasets: [{ data: monthlyData.map(m => m.count || 0) }],
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

  const handleStatusUpdate = async (bookingId, status) => {
    haptic.medium();
    try {
      await updateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      haptic.success();
    } catch { haptic.error(); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (!isSetupComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, flexGrow: 1, justifyContent: 'center' }}>
          <Text style={{ ...typography.h2, color: colors.gold, marginBottom: spacing.md, textAlign: 'center' }}>
            Bienvenue Prestataire !
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginBottom: spacing.xl, textAlign: 'center' }}>
            Veuillez remplir ce formulaire pour soumettre votre activité à l'administration.
          </Text>

          <GlassCard style={{ padding: spacing.lg }}>
            <Text style={{ ...typography.captionBold, color: colors.textSecondary, marginBottom: 8 }}>Nom de l'entreprise</Text>
            <TextInput
              style={styles.setupInput}
              placeholder="Ex: Surf Club Asilah"
              placeholderTextColor={colors.textMuted}
              value={setupForm.name}
              onChangeText={t => setSetupForm(f => ({ ...f, name: t }))}
            />

            <Text style={{ ...typography.captionBold, color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md }}>Catégorie</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.setupChip, setupForm.category === c.id && styles.setupChipActive]}
                  onPress={() => setSetupForm(f => ({ ...f, category: c.id }))}
                >
                  <Text style={[styles.setupChipText, setupForm.category === c.id && { color: colors.bg }]}>{c.labelFr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ ...typography.captionBold, color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md }}>Commune</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
              {[{id:'c1', n:'Asilah'}, {id:'c2', n:'Tanger'}, {id:'c3', n:'Chefchaouen'}].map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.setupChip, setupForm.commune === c.id && styles.setupChipActive]}
                  onPress={() => setSetupForm(f => ({ ...f, commune: c.id }))}
                >
                  <Text style={[styles.setupChipText, setupForm.commune === c.id && { color: colors.bg }]}>{c.n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ ...typography.captionBold, color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md }}>Description</Text>
            <TextInput
              style={[styles.setupInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Décrivez votre service..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={setupForm.desc}
              onChangeText={t => setSetupForm(f => ({ ...f, desc: t }))}
            />

            <GoldButton
              title="Soumettre pour validation"
              onPress={handleSetupSubmit}
              loading={setupLoading}
              style={{ marginTop: spacing.xl }}
            />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
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
              {tab === 'overview'    ? 'Vue d\'ensemble'
               : tab === 'bookings'  ? 'Réservations'
               : tab === 'activities'? 'Activités'
               : tab === 'reviews'   ? 'Avis'
               : 'Analytiques'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── ALERTS ── */}
        {providerProfile?.verified === false && (
          <GlassCard style={[styles.alertCard, { marginBottom: spacing.lg, borderColor: colors.warning }]}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning, flex: 1 }]}>
              Votre profil est en attente de validation par l'administration. Vos activités ne sont pas encore publiques.
            </Text>
          </GlassCard>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              {[
                { label: 'Revenu Total', value: formatPrice(totalRevenue), icon: 'cash-outline', color: colors.gold },
                { label: 'En Attente', value: `${pendingCount}`, icon: 'time-outline', color: colors.warning },
                { label: 'Note Moyenne', value: avgRating.toFixed(1) + ' ⭐', icon: 'star-outline', color: colors.goldLight },
                { label: 'Activités actives', value: `${activeActs}`, icon: 'tennisball-outline', color: colors.accent },
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

            {/* Alert pending */}
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

            {/* Revenue bar chart */}
            <Text style={styles.sectionTitle}>Revenus (7 mois)</Text>
            <GlassCard style={{ overflow: 'hidden', marginBottom: spacing.lg }}>
              <BarChart
                data={revenueChart}
                width={width - spacing.lg * 2 - 2}
                height={180}
                chartConfig={chartConfig}
                style={{ borderRadius: radius.md }}
                fromZero
              />
            </GlassCard>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Actions Rapides</Text>
            <View style={styles.actionsGrid}>
              {[
                { label: 'Gérer les activités', icon: 'tennisball-outline', color: colors.accent,
                  action: () => navigation.navigate('ProviderActivities') },
                { label: 'Voir les réservations', icon: 'calendar-outline', color: colors.gold,
                  action: () => setActiveTab('bookings') },
                { label: 'Avis clients', icon: 'star-outline', color: colors.goldLight,
                  action: () => setActiveTab('reviews') },
                { label: 'Analytiques', icon: 'bar-chart-outline', color: colors.success,
                  action: () => setActiveTab('analytics') },
              ].map((a, i) => (
                <TouchableOpacity key={i} style={styles.actionCard} onPress={() => { haptic.light(); a.action(); }}>
                  <View style={[styles.actionIcon, { backgroundColor: a.color + '22' }]}>
                    <Ionicons name={a.icon} size={22} color={a.color} />
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
            <View style={styles.bookingStats}>
              {[
                { label: 'En attente', value: pendingCount, color: colors.warning },
                { label: 'Confirmées', value: confirmedCount, color: colors.success },
                { label: 'Terminées', value: analytics?.completedBookings ?? bookings.filter(b => b.status === 'completed').length, color: colors.info },
                { label: 'Annulées', value: analytics?.cancelledBookings ?? bookings.filter(b => b.status === 'cancelled').length, color: colors.danger },
              ].map((s, i) => (
                <GlassCard key={i} style={styles.bStatCard}>
                  <Text style={[styles.bStatVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.bStatLabel}>{s.label}</Text>
                </GlassCard>
              ))}
            </View>
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
                    <Text style={styles.bookingDate}>{formatDate(b.createdAt)} • {b.time || '—'}</Text>
                    {b.activityName && <Text style={styles.bookingActivity}>🎯 {b.activityName}</Text>}
                    <Text style={styles.bookingParticipants}>{b.participants} participant{b.participants > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <Text style={styles.bookingPrice}>{formatPrice(b.totalPrice)}</Text>
                    <View style={[styles.bookingBadge, { backgroundColor: getBookingStatusColor(b.status) + '22' }]}>
                      <Text style={[styles.bookingStatus, { color: getBookingStatusColor(b.status) }]}>
                        {b.status === 'pending' ? 'En attente' : b.status === 'confirmed' ? 'Confirmé'
                          : b.status === 'completed' ? 'Terminé' : 'Annulé'}
                      </Text>
                    </View>
                  </View>
                </View>
                {b.status === 'pending' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleStatusUpdate(b.id, 'confirmed')}>
                      <Ionicons name="checkmark" size={16} color={colors.bg} />
                      <Text style={styles.acceptText}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleStatusUpdate(b.id, 'cancelled')}>
                      <Ionicons name="close" size={16} color={colors.danger} />
                      <Text style={styles.rejectText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            ))}
          </>
        )}

        {/* ── ACTIVITIES TAB ── */}
        {activeTab === 'activities' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>Mes Activités ({activities.length})</Text>
              <TouchableOpacity
                style={styles.addActBtn}
                onPress={() => navigation.navigate('ProviderActivities')}
              >
                <Ionicons name="add-circle" size={18} color={colors.gold} />
                <Text style={{ ...typography.captionBold, color: colors.gold }}>Gérer</Text>
              </TouchableOpacity>
            </View>
            {activities.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 44 }}>🎯</Text>
                <Text style={styles.emptyText}>Aucune activité créée</Text>
                <GoldButton title="+ Créer une activité" onPress={() => navigation.navigate('ProviderActivities')} size="md" style={{ marginTop: spacing.md }} />
              </View>
            ) : activities.map(act => {
              const cat = CATEGORIES.find(c => c.id === act.category);
              return (
                <GlassCard key={act.id} style={styles.actPreview}>
                  <View style={styles.actPreviewLeft}>
                    <Text style={{ fontSize: 24 }}>{cat?.emoji || '🎯'}</Text>
                    <View>
                      <Text style={styles.actName}>{act.name}</Text>
                      <Text style={styles.actMeta}>{cat?.labelFr} • {act.duration}</Text>
                      <Text style={styles.actPrice}>{act.price ? `${act.price} MAD/${act.priceUnit}` : 'Sur devis'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.activeTag, { backgroundColor: act.active !== false ? colors.success + '22' : colors.danger + '22' }]}>
                      <Text style={[styles.activeTagText, { color: act.active !== false ? colors.success : colors.danger }]}>
                        {act.active !== false ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                    <Text style={styles.actBookings}>{act.bookingCount || 0} rés.</Text>
                  </View>
                </GlassCard>
              );
            })}
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
                data={bookingChart}
                width={width - spacing.lg * 2 - 2}
                height={180}
                chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(29,214,195,${o})` }}
                bezier
                style={{ borderRadius: radius.md }}
              />
            </GlassCard>

            <Text style={styles.sectionTitle}>Indicateurs Clés</Text>
            {[
              { label: 'Taux de conversion', value: `${convRate}%`, color: colors.success },
              { label: 'Revenu total', value: formatPrice(totalRevenue), color: colors.gold },
              { label: 'Réservations totales', value: `${bookings.length}`, color: colors.accent },
              { label: 'Note moyenne', value: `${avgRating.toFixed(1)}/5`, color: colors.goldLight },
              { label: 'Activités actives', value: `${activeActs}/${activities.length}`, color: colors.info },
            ].map((kpi, i) => (
              <GlassCard key={i} style={styles.kpiRow}>
                <Text style={styles.kpiRowLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiRowValue, { color: kpi.color }]}>{kpi.value}</Text>
              </GlassCard>
            ))}
          </>
        )}

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <View style={{ paddingBottom: 40 }}>
            <Text style={styles.sectionTitle}>Profil Professionnel</Text>
            
            <Text style={styles.label}>Photo de couverture</Text>
            <TouchableOpacity style={styles.coverUpload} onPress={() => pickProfileImage('coverUrl')}>
              {editProfile?.coverUrl ? (
                <Image source={{ uri: editProfile.coverUrl }} style={styles.coverImg} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted }}>Ajouter une couverture</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md }}>
              <TouchableOpacity style={styles.logoUpload} onPress={() => pickProfileImage('imageUrl')}>
                {editProfile?.imageUrl ? (
                  <Image source={{ uri: editProfile.imageUrl }} style={styles.logoImg} />
                ) : (
                  <Ionicons name="camera" size={24} color={colors.textMuted} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Nom de l'établissement</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile?.name}
                  onChangeText={v => setEditProfile(p => ({ ...p, name: v }))}
                  placeholder="Ex: Surf Club Agadir"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={editProfile?.description}
              onChangeText={v => setEditProfile(p => ({ ...p, description: v }))}
              placeholder="Décrivez votre activité..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <GoldButton
              title={updatingProfile ? "Mise à jour..." : "Enregistrer les modifications"}
              onPress={handleUpdateProfile}
              loading={updatingProfile}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
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
  kpiCard: { width: (width - spacing.lg * 2 - spacing.sm) / 2, padding: spacing.md, gap: spacing.xs },
  kpiIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...typography.h2, fontWeight: '800' },
  kpiLabel: { ...typography.caption, color: colors.textMuted },

  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.lg },
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
  actionIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  
  label: { ...typography.captionBold, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  coverUpload: { width: '100%', height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  logoUpload: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.gold },
  logoImg: { width: '100%', height: '100%' },
  actionLabel: { ...typography.bodyMd, color: colors.textPrimary },

  bookingStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  bStatCard: { flex: 1, padding: spacing.sm, alignItems: 'center', gap: 2 },
  bStatVal: { ...typography.h3, fontWeight: '800' },
  bStatLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  bookingCard: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  bookingClient: { ...typography.h4, color: colors.textPrimary },
  bookingDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  bookingActivity: { ...typography.caption, color: colors.accent, marginTop: 2 },
  bookingParticipants: { ...typography.caption, color: colors.textMuted },
  bookingRight: { alignItems: 'flex-end', gap: spacing.xs },
  bookingPrice: { ...typography.h4, color: colors.gold },
  bookingBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full },
  bookingStatus: { ...typography.captionBold },
  bookingActions: { flexDirection: 'row', gap: spacing.sm },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing.sm },
  acceptText: { ...typography.bodyMd, color: colors.bg, fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.danger + '44' },
  rejectText: { ...typography.bodyMd, color: colors.danger },

  addActBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
  actPreviewLeft: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flex: 1 },
  actName: { ...typography.bodyMd, color: colors.textPrimary },
  actMeta: { ...typography.caption, color: colors.textMuted },
  actPrice: { ...typography.captionBold, color: colors.gold },
  actBookings: { ...typography.caption, color: colors.textMuted },
  activeTag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full },
  activeTagText: { ...typography.captionBold },

  ratingOverview: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  avgRatingBig: { ...typography.display, color: colors.gold },
  reviewCount: { ...typography.body, color: colors.textMuted },

  reviewCard: { padding: spacing.md, marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { ...typography.h4, color: colors.gold },
  reviewerName: { ...typography.bodyMd, color: colors.textPrimary },
  reviewDate: { ...typography.caption, color: colors.textMuted },
  reviewComment: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  kpiRowLabel: { ...typography.body, color: colors.textSecondary },
  kpiRowValue: { ...typography.h4, fontWeight: '800' },
  setupInput: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, ...typography.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  setupChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  setupChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  setupChipText: { ...typography.captionBold, color: colors.textSecondary },

  label: { ...typography.captionBold, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  coverUpload: { width: '100%', height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  logoUpload: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.gold },
  logoImg: { width: '100%', height: '100%' },
});
