/**
 * BookingScreen.js — HIWAYTI Booking Flow
 * Date selection, time slots, participants, checkout
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow, gradients } from '../utils/theme';
import { haptic, formatPrice, getBookingStatusColor } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { createBooking, fetchUserBookings } from '../services/api';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';
import Image from '../components/ui/Image';

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function generateNext14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function BookingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const activity = route?.params?.activity || null;
  const provider = route?.params?.provider || null;

  const [tab, setTab] = useState('new'); // 'new' | 'my'
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [participants, setParticipants] = useState(1);
  const [loading, setLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const days = generateNext14Days();
  const totalPrice = (activity?.price || provider?.price || 0) * participants;

  useEffect(() => {
    if (tab === 'my' && user) {
      setLoadingBookings(true);
      fetchUserBookings(user.uid)
        .then(setMyBookings)
        .catch(console.warn)
        .finally(() => setLoadingBookings(false));
    }
  }, [tab, user]);

  const handleBook = async () => {
    if (!user) return Alert.alert('Non connecté', 'Veuillez vous connecter.');
    if (!provider && !activity?.providerId) return Alert.alert('Erreur', 'Aucun prestataire sélectionné.');
    
    haptic.medium();
    setLoading(true);
    try {
      const selectedDay = days[selectedDate];
      const [hours, minutes] = selectedTime.split(':');
      const bookingDate = new Date(
        selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(),
        parseInt(hours), parseInt(minutes)
      );

      const finalProviderId = provider?.id || activity?.providerId;
      const finalProviderName = provider?.name || provider?.displayName || activity?.providerName || 'Prestataire';

      await createBooking({
        userId: user.uid,
        userName: user.displayName || 'Client',
        userEmail: user.email,
        providerId: finalProviderId,
        activityId: activity?.id || 'general',
        providerName: finalProviderName,
        activityName: activity?.name || 'Prestation directe',
        communeId: activity?.communeId || provider?.communeId || '',
        date: bookingDate.toISOString(),
        time: selectedTime,
        participants,
        totalPrice,
        currency: 'MAD',
        category: activity?.category || provider?.category || 'other',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      haptic.success();
      Alert.alert(
        'Réservation envoyée ! 🎉',
        `Votre réservation chez ${finalProviderName} le ${selectedDay.toLocaleDateString('fr-FR')} à ${selectedTime} a été enregistrée.`,
        [{ text: 'Voir mes réservations', onPress: () => setTab('my') }]
      );
    } catch (err) {
      haptic.error();
      console.error('[BOOKING_ERROR]', err);
      Alert.alert('Erreur', err.message || 'Impossible de créer la réservation.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyNew = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={64} color={colors.goldDim} />
      </View>
      <Text style={styles.emptyTitle}>Prêt pour l'aventure ?</Text>
      <Text style={styles.emptyText}>Sélectionnez une activité ou un prestataire pour commencer votre réservation.</Text>
      <AppButton 
        title="Découvrir les activités" 
        onPress={() => navigation.navigate('Discover')}
        style={{ width: '100%', marginTop: spacing.xl }}
        gradient={gradients.gold}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tab === 'new' ? 'Réservation' : 'Mes Réservations'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        {['new', 'my'].map(t_ => (
          <TouchableOpacity
            key={t_}
            style={[styles.tab, tab === t_ && styles.tabActive]}
            onPress={() => { haptic.select(); setTab(t_); }}
          >
            <Text style={[styles.tabText, tab === t_ && styles.tabTextActive]}>
              {t_ === 'new' ? 'Nouvelle' : 'Historique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'new' ? (
        !activity && !provider ? renderEmptyNew() : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <GlassCard style={styles.providerBanner} goldBorder>
              <View style={styles.providerIconWrap}>
                <Image 
                  source={{ uri: activity?.imageUrl || provider?.avatarUrl || provider?.coverImage }} 
                  style={styles.providerImage} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName} numberOfLines={1}>{provider?.name || provider?.displayName || activity?.providerName || 'Prestataire'}</Text>
                <Text style={styles.providerCommune} numberOfLines={1}>
                  {activity?.name || 'Activité'}
                  {activity?.communeName ? ` • ${activity.communeName}` : (provider?.commune ? ` • ${provider.commune}` : '')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.providerPrice}>{formatPrice(activity?.price || provider?.price || 0)}</Text>
                <Text style={styles.priceSub}>/{activity?.priceUnit || provider?.priceUnit || 'session'}</Text>
              </View>
            </GlassCard>

            <Text style={styles.sectionTitle}>1. Choisir une date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
              {days.map((d, i) => {
                const active = selectedDate === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateCard, active && styles.dateCardActive]}
                    onPress={() => { haptic.select(); setSelectedDate(i); }}
                  >
                    <Text style={[styles.dateDow, active && { color: colors.bg }]}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[styles.dateNum, active && { color: colors.bg }]}>
                      {d.getDate()}
                    </Text>
                    <Text style={[styles.dateMon, active && { color: colors.bg + 'aa' }]}>
                      {d.toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>2. Choisir l'heure</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(slot => {
                const active = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlot, active && styles.timeSlotActive]}
                    onPress={() => { haptic.select(); setSelectedTime(slot); }}
                  >
                    <Text style={[styles.timeSlotText, active && { color: colors.bg }]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>3. Nombre de participants</Text>
            <View style={styles.participantsRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { haptic.select(); setParticipants(p => Math.max(1, p - 1)); }}
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{participants}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => { haptic.select(); setParticipants(p => Math.min(20, p + 1)); }}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <GlassCard style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Récapitulatif</Text>
                <Text style={styles.summaryValue}>
                  {days[selectedDate].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {selectedTime}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total à régler</Text>
                <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
              </View>
            </GlassCard>

            <AppButton
              title={loading ? "Envoi en cours..." : "Confirmer la réservation"}
              onPress={handleBook}
              loading={loading}
              size="lg"
              gradient={gradients.gold}
              style={{ marginTop: spacing.xl, marginBottom: spacing.xxxl }}
            />
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loadingBookings ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
          ) : myBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📅</Text>
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptyText}>Vous n'avez pas encore de réservations prévues.</Text>
            </View>
          ) : (
            myBookings.map(booking => (
              <GlassCard key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={[styles.bookingStatus, { backgroundColor: getBookingStatusColor(booking.status) + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getBookingStatusColor(booking.status) }]} />
                    <Text style={[styles.statusText, { color: getBookingStatusColor(booking.status) }]}>
                      {booking.status === 'pending' ? 'En attente'
                        : booking.status === 'confirmed' ? 'Confirmé'
                        : booking.status === 'completed' ? 'Terminé' : 'Annulé'}
                    </Text>
                  </View>
                  <Text style={styles.bookingPrice}>{formatPrice(booking.totalPrice)}</Text>
                </View>
                <Text style={styles.bookingActivity}>{booking.activityName || 'Expérience'}</Text>
                <Text style={styles.bookingProvider}>{booking.providerName}</Text>
                <View style={styles.bookingMeta}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.bookingMetaText}>
                    {booking.date ? new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                  </Text>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                  <Text style={styles.bookingMetaText}>{booking.time || '—'}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },

  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.full, padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: colors.gold },
  tabText: { ...typography.bodyMd, color: colors.textMuted },
  tabTextActive: { color: colors.bg, fontWeight: '700' },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },

  providerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  providerIconWrap: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgElevated },
  providerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  providerName: { ...typography.bodyBold, color: colors.textPrimary },
  providerCommune: { ...typography.caption, color: colors.textMuted },
  providerPrice: { ...typography.h3, color: colors.gold },
  priceSub: { ...typography.caption, color: colors.textMuted },

  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.lg },

  dateScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    alignItems: 'center', minWidth: 70,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dateCardActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dateDow: { ...typography.tag, color: colors.textMuted, marginBottom: 4, fontSize: 10 },
  dateNum: { ...typography.h3, color: colors.textPrimary },
  dateMon: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeSlot: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: colors.bgCard, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  timeSlotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  timeSlotText: { ...typography.bodyMd, color: colors.textPrimary },

  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  counterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  counterValue: { ...typography.h2, color: colors.gold, minWidth: 40, textAlign: 'center' },

  summary: { padding: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { ...typography.body, color: colors.textMuted },
  summaryValue: { ...typography.bodyMd, color: colors.textPrimary },
  summaryTotal: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.h4, color: colors.textPrimary },
  totalValue: { ...typography.h3, color: colors.gold },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.goldBorder },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  bookingCard: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.captionBold },
  bookingPrice: { ...typography.h4, color: colors.gold },
  bookingActivity: { ...typography.bodyBold, color: colors.textPrimary },
  bookingProvider: { ...typography.caption, color: colors.gold },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingMetaText: { ...typography.caption, color: colors.textMuted },
});
